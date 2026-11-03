# Deploy worker render video (render-worker/) lên Google Cloud Run.
# Chạy từ thư mục gốc dự án:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-render-worker.ps1
#
# Script sẽ:
#  1. Tạo khoá dùng chung WORKER_SECRET trong Secret Manager (nếu chưa có) và ghi một bản vào
#     .env.render-worker.local (đã gitignore) để bạn chép sang Vercel (biến RENDER_WORKER_SECRET)
#  2. Cấp quyền đọc khoá cho tài khoản dịch vụ mặc định của Cloud Run
#  3. Deploy bản render-worker ĐÃ COMMIT (git ref, mặc định HEAD) lên Cloud Run, mở công khai
#     (worker tự từ chối mọi request không có đúng WORKER_SECRET)
param(
  [string]$ProjectId = 'mck-render-0xyn8',
  [string]$Region = 'asia-southeast1',
  [string]$Service = 'mck-render-worker',
  [string]$GitRef = 'HEAD',
  [string]$CallbackPrefixes = 'https://www.xenangmck.jp/',
  [string]$Bucket = 'mck-media'
)
# Windows PowerShell 5.1 coi mọi dòng gcloud ghi ra stderr (kể cả thông báo tiến độ) là lỗi nếu đặt 'Stop',
# nên dùng 'Continue' và kiểm tra $LASTEXITCODE của từng lệnh gcloud / git
$ErrorActionPreference = 'Continue'

$gcloud = Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'
if (-not (Test-Path $gcloud)) { $gcloud = 'gcloud' }
function Invoke-Gcloud { & $gcloud @args; if ($LASTEXITCODE -ne 0) { throw "gcloud $($args -join ' ') thất bại" } }

$secretName = 'render-worker-secret'
$localFile = Join-Path (Get-Location) '.env.render-worker.local'

# 1. Khoá dùng chung web <-> worker
$existing = & $gcloud secrets list --project $ProjectId --filter="name:$secretName" --format='value(name)' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Không đọc được danh sách Secret Manager (kiểm tra đăng nhập gcloud / project)' }
if (-not $existing) {
  Write-Host '==> Tạo khoá WORKER_SECRET trong Secret Manager'
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  $tmp = Join-Path $env:TEMP ("ws-" + [guid]::NewGuid() + '.txt')
  [IO.File]::WriteAllText($tmp, $secret)
  try { Invoke-Gcloud secrets create $secretName --replication-policy=automatic --data-file=$tmp --project $ProjectId }
  finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
  [IO.File]::WriteAllLines($localFile, @(
    '# KHONG commit file nay. Chep gia tri ben duoi vao Vercel: bien RENDER_WORKER_SECRET',
    "# Cung gia tri dang luu trong Google Secret Manager: project $ProjectId, secret $secretName",
    "RENDER_WORKER_SECRET=$secret"
  ))
  Write-Host "    Đã lưu một bản vào $localFile (dùng cho Vercel)"
} else {
  Write-Host "==> Khoá $secretName đã có sẵn trong Secret Manager (giữ nguyên)"
}

# 2. Cho tài khoản dịch vụ mặc định của Cloud Run đọc khoá
$projectNumber = (& $gcloud projects describe $ProjectId --format='value(projectNumber)' 2>$null)
if (-not $projectNumber) { throw "Không lấy được project number của $ProjectId" }
$runSa = "$projectNumber-compute@developer.gserviceaccount.com"
Write-Host "==> Cấp quyền đọc khoá cho $runSa"
Invoke-Gcloud secrets add-iam-policy-binding $secretName --member="serviceAccount:$runSa" --role='roles/secretmanager.secretAccessor' --project $ProjectId --quiet | Out-Null

# 3. Xuất đúng bản render-worker đã commit (tránh deploy code đang sửa dở)
$work = Join-Path $env:TEMP ("render-worker-" + [guid]::NewGuid())
New-Item -ItemType Directory $work | Out-Null
$zip = Join-Path $work 'src.zip'
git archive --format=zip -o $zip $GitRef render-worker
if ($LASTEXITCODE -ne 0) { throw "git archive $GitRef thất bại" }
Expand-Archive $zip -DestinationPath $work -ErrorAction Stop
$source = Join-Path $work 'render-worker'
Write-Host "==> Deploy render-worker (${GitRef} = $(git rev-parse --short $GitRef)) lên Cloud Run ($Region)"

try {
  # --no-cpu-throttling: worker trả lời ngay rồi render ở nền, cần CPU luôn được cấp
  # --allow-unauthenticated: Vercel gọi trực tiếp; worker tự kiểm tra WORKER_SECRET
  # --update-*: chỉ thêm / ghi đè các biến dưới đây, giữ nguyên khoá R2_* đã thêm trên Console
  # (--set-env-vars / --set-secrets sẽ xoá hết biến cũ của service)
  Invoke-Gcloud run deploy $Service `
    --source $source `
    --region $Region --project $ProjectId `
    --cpu 2 --memory 2Gi --no-cpu-throttling `
    --concurrency 10 --min-instances 0 --max-instances 2 --timeout 300 `
    --allow-unauthenticated `
    --update-env-vars "R2_BUCKET=$Bucket,CALLBACK_URL_PREFIXES=$CallbackPrefixes" `
    --update-secrets "WORKER_SECRET=${secretName}:latest" `
    --quiet
} finally {
  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}

$url = (& $gcloud run services describe $Service --region $Region --project $ProjectId --format='value(status.url)' 2>$null)
Write-Host ''
Write-Host "==> Xong. Service URL (RENDER_WORKER_URL trên Vercel): $url"
# Cloud Run chặn các đường dẫn kết thúc bằng "z" (VD /healthz) ở tầng Google Front End,
# nên kiểm tra bằng POST /render không kèm khoá: worker đang chạy sẽ trả 401 Unauthorized
try {
  Invoke-RestMethod -Method Post -Uri "$url/render" -ContentType 'application/json' -Body '{}' | Out-Null
  Write-Host '    Kiểm tra: worker trả lời bất thường (không yêu cầu khoá)'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 401) { Write-Host '    Kiểm tra: worker đang chạy (POST /render không khoá -> 401 như mong đợi)' }
  else { Write-Host "    Kiểm tra: worker chưa phản hồi đúng (HTTP $code)" }
}
Write-Host ''
Write-Host 'Còn thiếu khoá R2 cho worker. Sau khi tạo bucket + API token R2, thêm vào Cloud Run:'
Write-Host "  Console: Cloud Run > $Service > Edit & deploy new revision > Variables & Secrets"
Write-Host '  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (nên dùng Secret Manager), R2_PUBLIC_URL'
