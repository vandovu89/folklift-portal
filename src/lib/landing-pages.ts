import type { PowerKind } from '@/lib/utils';

/**
 * Nội dung các trang đích theo từ khóa (xe nâng điện cũ, xe nâng dầu cũ, ...).
 * Bản tiếng Việt có hướng dẫn mua + FAQ đầy đủ (đây là thị trường chính);
 * bản tiếng Anh chỉ có phần giới thiệu ngắn và danh sách xe.
 */

export type LandingFilter =
  | { kind: 'all' }
  | { kind: 'power'; power: PowerKind }
  | { kind: 'maker'; maker: string };

export interface LandingSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingContent {
  /** Path sau locale, VD '/xe-nang-dien-cu' */
  path: string;
  filter: LandingFilter;
  /** Nhãn ngắn dùng cho menu / breadcrumb / liên kết nội bộ */
  label: { vi: string; en: string };
  vi: {
    title: string;
    description: string;
    h1: string;
    intro: string[];
    sections: LandingSection[];
    faq: LandingFaq[];
  };
  en: {
    title: string;
    description: string;
    h1: string;
    intro: string[];
  };
}

const CHECKLIST_COMMON: string[] = [
  'Xem xe thực tế hoặc yêu cầu video quay liên tục: nâng hạ hết hành trình, nghiêng khung, chạy tiến lùi, phanh và phanh tay.',
  'Kiểm tra khung nâng (mast): con lăn, xích nâng không giãn quá mức, không có vết hàn nứt ở khung và giá nĩa.',
  'Kiểm tra xi lanh nâng / nghiêng không rò dầu, nĩa không cong vênh, độ mòn gót nĩa còn trong giới hạn.',
  'Đối chiếu số khung (serial) trên xe với giấy tờ nhập khẩu: tờ khai hải quan, hóa đơn VAT.',
  'Hỏi rõ phạm vi bảo hành, ai chịu chi phí vận chuyển và hỗ trợ kỹ thuật sau bán hàng.',
];

export const POWER_PAGES: Record<'electric' | 'diesel' | 'gas' | 'japan', LandingContent> = {
  electric: {
    path: '/xe-nang-dien-cu',
    filter: { kind: 'power', power: 'electric' },
    label: { vi: 'Xe nâng điện cũ', en: 'Used electric forklifts' },
    vi: {
      title: 'Xe Nâng Điện Cũ Nhật Bản – Giá Tốt, Ắc Quy Đã Kiểm Tra',
      description:
        'Xe nâng điện cũ nhập khẩu Nhật Bản: ngồi lái, đứng lái (reach truck) 1–3 tấn của Toyota, Nichiyu, Komatsu, Sumitomo. Ắc quy đã kiểm tra, hình ảnh thật, giá công khai.',
      h1: 'Xe nâng điện cũ nhập khẩu Nhật Bản',
      intro: [
        'Xe nâng điện cũ là lựa chọn kinh tế nhất cho kho hàng, nhà xưởng và kho lạnh: không khói, chạy êm, chi phí điện sạc thấp hơn nhiều so với tiền dầu hoặc gas. Toàn bộ xe nâng điện tại Xe Nâng MCK được nhập khẩu trực tiếp từ Nhật Bản, nơi xe được bảo dưỡng và kiểm định định kỳ hằng năm theo quy định.',
        'Bên dưới là danh sách xe nâng điện cũ đang có tại kho hoặc sắp về, kèm hướng dẫn chọn xe, cách đánh giá ắc quy và số giờ hoạt động.',
      ],
      sections: [
        {
          heading: 'Ưu và nhược điểm của xe nâng điện',
          bullets: [
            'Ưu điểm: không khí thải, độ ồn thấp – phù hợp kho thực phẩm, dược phẩm, kho lạnh và làm việc trong nhà.',
            'Ưu điểm: chi phí vận hành thấp, ít chi tiết hao mòn hơn động cơ đốt trong (không thay nhớt máy, lọc nhiên liệu, két nước).',
            'Ưu điểm: dòng đứng lái (reach truck) quay đầu hẹp, nâng cao 5–7 m, tối ưu diện tích kho kệ.',
            'Nhược điểm: cần thời gian sạc (khoảng 8 giờ cho bình axit-chì) và nên có chỗ sạc thông thoáng.',
            'Nhược điểm: không phù hợp bãi ngoài trời gồ ghề, ngập nước hoặc làm việc liên tục nhiều ca mà không có bình dự phòng.',
          ],
        },
        {
          heading: 'Đánh giá ắc quy xe nâng điện cũ',
          paragraphs: [
            'Ắc quy là bộ phận đắt nhất của xe nâng điện, vì vậy cần kiểm tra kỹ trước khi mua. Với bình axit-chì, hãy đo tỷ trọng dung dịch từng ngăn sau khi sạc đầy (khoảng 1,28) – các ngăn phải đều nhau; một ngăn lệch nhiều thường là dấu hiệu bình đã yếu. Nên chạy thử có tải để xem điện áp có tụt nhanh hay không.',
            'Bình được chăm sóc tốt dùng được khoảng 1.200–1.500 chu kỳ sạc. Sau khi mua, châm nước cất định kỳ, không để bình cạn kiệt mới sạc và không ngắt sạc giữa chừng sẽ giúp kéo dài tuổi thọ đáng kể.',
          ],
        },
        {
          heading: 'Số giờ hoạt động bao nhiêu là hợp lý?',
          paragraphs: [
            'Xe nâng điện cũ Nhật Bản thường có từ 3.000 đến 10.000 giờ. Con số này chỉ mang tính tham khảo: tùy đời xe, đồng hồ giờ có thể đếm thời gian bật khóa hoặc thời gian thực sự vận hành. Tình trạng khung nâng, mô tơ, bo điều khiển và ắc quy quan trọng hơn con số trên đồng hồ.',
          ],
        },
        { heading: 'Checklist trước khi mua', bullets: CHECKLIST_COMMON },
      ],
      faq: [
        {
          q: 'Nên chọn xe nâng điện ngồi lái hay đứng lái?',
          a: 'Xe ngồi lái (counterbalance) chạy được cả trong kho và sân bê tông, phù hợp bốc xếp lên xe tải. Xe đứng lái (reach truck) gọn hơn, quay đầu trong lối đi hẹp và nâng cao, phù hợp kho kệ nhiều tầng.',
        },
        {
          q: 'Xe nâng điện cũ có dùng được ngoài trời không?',
          a: 'Dùng được trên sân bê tông khô ráo. Không nên chạy dưới mưa lớn, nền ngập nước hoặc đường đất gồ ghề vì dễ ảnh hưởng mô tơ và bo mạch điện tử.',
        },
        {
          q: 'Sạc xe nâng điện mất bao lâu, cần điện gì?',
          a: 'Bình axit-chì thường sạc đầy khoảng 8 giờ, nên sạc qua đêm. Bộ sạc đi kèm xe Nhật thường dùng điện 3 pha hoặc 1 pha 200V; MCK sẽ tư vấn chuyển đổi cho phù hợp nguồn điện xưởng của bạn.',
        },
      ],
    },
    en: {
      title: 'Used Electric Forklifts from Japan',
      description:
        'Used electric forklifts imported from Japan: counterbalance and reach trucks 1–3 t from Toyota, Nichiyu, Komatsu and Sumitomo. Checked batteries, real photos, published prices.',
      h1: 'Used electric forklifts imported from Japan',
      intro: [
        'Quiet, emission-free and cheap to run, electric forklifts are the best fit for warehouses, factories and cold stores. Every unit below was imported directly from Japan and its battery is checked before sale.',
      ],
    },
  },

  diesel: {
    path: '/xe-nang-dau-cu',
    filter: { kind: 'power', power: 'diesel' },
    label: { vi: 'Xe nâng dầu cũ', en: 'Used diesel forklifts' },
    vi: {
      title: 'Xe Nâng Dầu Cũ Nhật Bản – Diesel 2.5–5 Tấn Nhập Khẩu',
      description:
        'Xe nâng dầu (diesel) cũ nhập khẩu Nhật Bản 2.5–5 tấn của Toyota, Komatsu, TCM. Hướng dẫn kiểm tra động cơ, hộp số, khung nâng trước khi mua. Báo giá nhanh qua Zalo.',
      h1: 'Xe nâng dầu cũ nhập khẩu Nhật Bản',
      intro: [
        'Xe nâng dầu (diesel) là “ngựa thồ” của bãi ngoài trời: lực kéo mạnh, chịu được nền đất, mưa nắng và làm việc liên tục nhiều ca chỉ cần châm thêm nhiên liệu. Đây là lựa chọn phổ biến cho bãi vật liệu xây dựng, cảng, xưởng gỗ và nhà máy thép.',
        'Xe nâng dầu tại MCK được nhập theo đơn từ Nhật Bản. Nếu danh sách bên dưới chưa có mẫu bạn cần, hãy gửi yêu cầu – chúng tôi tìm xe đúng tải trọng và chiều cao nâng trong nguồn hàng Nhật.',
      ],
      sections: [
        {
          heading: 'Khi nào nên chọn xe nâng dầu?',
          bullets: [
            'Làm việc chủ yếu ngoài trời, nền không bằng phẳng hoặc thường xuyên gặp mưa.',
            'Tải nặng từ 2.5 tấn trở lên, nâng hàng cồng kềnh như thép, gỗ, gạch, container rỗng.',
            'Chạy nhiều ca liên tục, không có thời gian dừng sạc như xe điện.',
            'Hạn chế: có khí thải và tiếng ồn, không nên dùng trong kho kín, kho thực phẩm hay kho lạnh.',
          ],
        },
        {
          heading: 'Kiểm tra động cơ và hộp số xe nâng dầu cũ',
          paragraphs: [
            'Khởi động khi máy nguội: máy nổ ngay, không có khói trắng hoặc khói đen kéo dài. Mở nắp châm nhớt khi máy đang nổ – hơi xì mạnh (blow-by) là dấu hiệu xéc măng đã mòn. Các dòng động cơ phổ biến trên xe Nhật như Toyota 1DZ, Isuzu C240 hay Yanmar đều bền và dễ tìm phụ tùng tại Việt Nam.',
            'Với hộp số tự động (biến mô), cho xe chạy tiến – lùi có tải: chuyển số phải êm, không giật, không trượt khi leo dốc. Kiểm tra thêm két nước, dây curoa và hệ thống phanh.',
          ],
        },
        { heading: 'Checklist trước khi mua', bullets: CHECKLIST_COMMON },
      ],
      faq: [
        {
          q: 'Xe nâng dầu và xe nâng điện, loại nào rẻ hơn khi sử dụng lâu dài?',
          a: 'Xe điện có chi phí năng lượng và bảo dưỡng thấp hơn rõ rệt. Xe dầu bù lại có giá mua thấp hơn ở cùng tải trọng lớn và làm được ngoài trời. Nếu chủ yếu làm trong nhà, xe điện thường hoàn vốn nhanh hơn.',
        },
        {
          q: 'Xe nâng dầu cũ Nhật có tốn nhiên liệu không?',
          a: 'Xe 2.5–3 tấn thường tiêu thụ khoảng 2–3 lít dầu mỗi giờ tùy cường độ làm việc. Bảo dưỡng lọc gió, lọc nhiên liệu đúng hạn giúp xe không bị hao dầu.',
        },
        {
          q: 'Kho chưa có xe nâng dầu, tôi đặt được không?',
          a: 'Được. Hãy cho chúng tôi biết tải trọng, chiều cao nâng và ngân sách; MCK sẽ gửi danh sách xe đang có tại Nhật Bản kèm hình ảnh để bạn chọn trước khi nhập.',
        },
      ],
    },
    en: {
      title: 'Used Diesel Forklifts from Japan',
      description:
        'Used diesel forklifts 2.5–5 t imported from Japan: Toyota, Komatsu, TCM. Engine and transmission checked before sale. Request a unit from our Japan sourcing.',
      h1: 'Used diesel forklifts imported from Japan',
      intro: [
        'Diesel forklifts are built for outdoor yards and heavy loads. We import them to order from Japan – if the list below does not have what you need, send us your capacity and lift height.',
      ],
    },
  },

  gas: {
    path: '/xe-nang-gas-cu',
    filter: { kind: 'power', power: 'gas' },
    label: { vi: 'Xe nâng gas cũ', en: 'Used LPG forklifts' },
    vi: {
      title: 'Xe Nâng Gas Cũ Nhật Bản – Xe Nâng Xăng/Gas LPG Nhập Khẩu',
      description:
        'Xe nâng gas (LPG) và xăng-gas cũ nhập khẩu Nhật Bản 1.5–3 tấn của Toyota, Nissan, TCM. Ưu nhược điểm, cách kiểm tra bộ gas và động cơ trước khi mua.',
      h1: 'Xe nâng gas cũ nhập khẩu Nhật Bản',
      intro: [
        'Xe nâng gas (LPG) là phương án trung gian giữa xe điện và xe dầu: khí thải sạch hơn xe dầu nên dùng được trong nhà xưởng thông thoáng, đồng thời vẫn làm việc liên tục cả ngày – hết gas chỉ cần thay bình trong vài phút.',
        'Ở Nhật Bản, nhiều xe động cơ xăng được dùng kèm bộ chuyển gas. Xe nâng gas tại MCK được nhập theo đơn; nếu danh sách bên dưới chưa có xe phù hợp, hãy gửi yêu cầu để chúng tôi tìm nguồn tại Nhật.',
      ],
      sections: [
        {
          heading: 'Ưu và nhược điểm của xe nâng gas',
          bullets: [
            'Ưu điểm: thay bình gas nhanh, không phải chờ sạc; chạy được nhiều ca liên tục.',
            'Ưu điểm: êm và sạch hơn xe dầu, phù hợp xưởng sản xuất có thông gió, kho bán ngoài trời.',
            'Ưu điểm: động cơ xăng của xe Nhật (như Toyota 4Y, Nissan K21/K25) đơn giản, dễ sửa, phụ tùng sẵn.',
            'Nhược điểm: chi phí gas cao hơn tiền điện; cần khu vực cất giữ bình gas an toàn, tuân thủ phòng cháy chữa cháy.',
            'Nhược điểm: không dùng trong kho kín, kho lạnh hoặc kho thực phẩm yêu cầu không khí thải.',
          ],
        },
        {
          heading: 'Kiểm tra hệ thống gas và động cơ',
          paragraphs: [
            'Kiểm tra van bình, ống dẫn và bộ hóa hơi (vaporizer) không rò rỉ – dùng nước xà phòng bôi lên các khớp nối khi đang mở van. Máy phải nổ êm ở chế độ không tải, không bị hụt hơi khi nâng tải. Xem thêm tình trạng két nước và bugi, mobin đánh lửa.',
          ],
        },
        { heading: 'Checklist trước khi mua', bullets: CHECKLIST_COMMON },
      ],
      faq: [
        {
          q: 'Xe nâng gas có dùng trong nhà xưởng được không?',
          a: 'Được nếu xưởng thông thoáng. Khí thải xe gas sạch hơn xe dầu nhưng vẫn có CO, vì vậy không nên dùng trong kho kín hoặc kho lạnh – khi đó xe nâng điện là lựa chọn phù hợp hơn.',
        },
        {
          q: 'Một bình gas chạy được bao lâu?',
          a: 'Bình gas xe nâng loại phổ biến thường chạy khoảng 6–8 giờ với xe 2.5 tấn, tùy cường độ nâng và quãng đường di chuyển.',
        },
        {
          q: 'Có thể chuyển xe nâng xăng sang chạy gas không?',
          a: 'Có. Xe nâng xăng Nhật thường lắp được bộ chuyển đổi gas LPG; MCK có thể lắp và cân chỉnh trước khi giao xe.',
        },
      ],
    },
    en: {
      title: 'Used LPG Forklifts from Japan',
      description:
        'Used LPG and gasoline/LPG forklifts 1.5–3 t imported from Japan: Toyota, Nissan, TCM. Imported to order with engine and gas system checked.',
      h1: 'Used LPG forklifts imported from Japan',
      intro: [
        'LPG forklifts combine all-day running with cleaner exhaust than diesel. We import them to order from Japan – send us your requirements if the list below is empty.',
      ],
    },
  },

  japan: {
    path: '/xe-nang-nhat-ban',
    filter: { kind: 'all' },
    label: { vi: 'Xe nâng Nhật Bản', en: 'Japanese forklifts' },
    vi: {
      title: 'Xe Nâng Nhật Bản Cũ Nhập Khẩu Trực Tiếp – Toyota, Komatsu, Nichiyu',
      description:
        'Xe nâng Nhật Bản cũ nhập khẩu trực tiếp, đầy đủ tờ khai hải quan và hóa đơn VAT: Toyota, Komatsu, Nichiyu, Sumitomo, TCM. Vì sao xe nâng bãi Nhật bền và cách chọn đúng xe.',
      h1: 'Xe nâng Nhật Bản cũ – nhập khẩu trực tiếp',
      intro: [
        'Xe nâng Nhật Bản đã qua sử dụng (còn gọi là xe nâng bãi Nhật) được ưa chuộng tại Việt Nam vì độ bền cao, vận hành ổn định và phụ tùng dễ tìm. Xe Nâng MCK nhập khẩu trực tiếp từ Nhật Bản, không qua trung gian, nên kiểm soát được nguồn gốc và tình trạng từng chiếc.',
        'Danh sách dưới đây gồm toàn bộ xe đang có tại kho Hưng Yên, xe đang trên đường về và xe còn ở Nhật có thể đặt trước.',
      ],
      sections: [
        {
          heading: 'Vì sao nên chọn xe nâng cũ Nhật Bản?',
          bullets: [
            'Chất lượng chế tạo: các hãng như Toyota, Komatsu, Nichiyu, TCM sản xuất theo tiêu chuẩn khắt khe, khung nâng và hệ thống thủy lực rất bền.',
            'Được bảo dưỡng đều đặn: tại Nhật, xe nâng phải kiểm tra định kỳ hằng năm theo luật an toàn lao động, nên xe thanh lý thường có lịch sử bảo dưỡng tốt.',
            'Phụ tùng phổ biến: các dòng xe Nhật chiếm phần lớn thị trường xe nâng cũ tại Việt Nam, sửa chữa nhanh và chi phí hợp lý.',
            'Giá hợp lý: chỉ bằng một phần giá xe mới cùng tải trọng, phù hợp doanh nghiệp vừa và nhỏ.',
          ],
        },
        {
          heading: 'Chọn xe theo nhu cầu',
          paragraphs: [
            'Kho trong nhà, kho lạnh, kho thực phẩm: chọn xe nâng điện (ngồi lái hoặc đứng lái). Bãi ngoài trời, tải nặng: chọn xe nâng dầu. Xưởng sản xuất thông thoáng cần chạy cả ngày: cân nhắc xe nâng gas. Hãy xác định trước tải trọng tối đa, chiều cao nâng cần thiết và chiều cao cửa kho/container để chọn khung nâng (2 tầng, 3 tầng, có nâng tự do) phù hợp.',
          ],
        },
        {
          heading: 'Giấy tờ và nguồn gốc',
          paragraphs: [
            'Mỗi xe tại MCK đều có tờ khai hải quan nhập khẩu và xuất hóa đơn VAT khi bán. Số khung trên xe khớp với giấy tờ, giúp doanh nghiệp hạch toán tài sản và kiểm định an toàn thuận lợi.',
          ],
        },
        { heading: 'Checklist trước khi mua', bullets: CHECKLIST_COMMON },
      ],
      faq: [
        {
          q: 'Xe nâng Nhật Bản cũ thường đời bao nhiêu?',
          a: 'Phần lớn xe nhập về có đời khoảng 2010–2020. Đời xe càng mới thì giá càng cao, nhưng tình trạng thực tế (khung nâng, động cơ/ắc quy, giờ hoạt động) mới là yếu tố quyết định.',
        },
        {
          q: 'Mua xe nâng cũ Nhật có xuất hóa đơn VAT không?',
          a: 'Có. Giá niêm yết trên website đã gồm VAT và MCK xuất hóa đơn cho doanh nghiệp.',
        },
        {
          q: 'Tôi có thể đặt xe đang ở Nhật Bản không?',
          a: 'Có. Xe gắn nhãn “Nhật Bản” là xe đang ở Nhật; bạn có thể đặt cọc trước, chúng tôi gửi thêm hình ảnh, video và thời gian dự kiến về kho.',
        },
      ],
    },
    en: {
      title: 'Used Japanese Forklifts – Imported Directly',
      description:
        'Used Japanese forklifts imported directly with customs papers and VAT invoice: Toyota, Komatsu, Nichiyu, Sumitomo, TCM. In stock in Vietnam, arriving soon or reservable in Japan.',
      h1: 'Used Japanese forklifts – imported directly',
      intro: [
        'Japanese forklifts are durable, well maintained under Japan’s annual inspection rules and easy to service in Vietnam. Below is every unit in our Hung Yen yard, in transit, or still in Japan.',
      ],
    },
  },
};

interface BrandInfo {
  /** Giá trị trong cột maker của DB */
  maker: string;
  name: string;
  intro: string;
  series: string[];
  faq: LandingFaq[];
}

const BRAND_INFO: Record<string, BrandInfo> = {
  toyota: {
    maker: 'TOYOTA',
    name: 'Toyota',
    intro:
      'Toyota là thương hiệu xe nâng bán chạy hàng đầu tại Nhật Bản và trên thế giới. Xe nâng Toyota cũ được ưa chuộng nhờ độ bền, vận hành êm và mạng lưới phụ tùng rộng – gần như garage xe nâng nào ở Việt Nam cũng sửa được Toyota.',
    series: [
      'Xe nâng điện ngồi lái: dòng 7FB / 8FB (1–3 tấn), có bản 3 bánh 7FBE / 8FBE quay đầu hẹp.',
      'Xe nâng điện đứng lái (reach truck): dòng 7FBR / 8FBR, nâng cao tới 6–7 m cho kho kệ.',
      'Xe nâng dầu: dòng 7FD / 8FD, động cơ 1DZ bền bỉ; xe nâng xăng/gas: 7FG / 8FG với động cơ 4Y.',
    ],
    faq: [
      {
        q: 'Đời xe nâng Toyota 7 series và 8 series khác nhau thế nào?',
        a: '8 series là thế hệ mới hơn (từ khoảng 2007–2008), tiết kiệm năng lượng hơn và có hệ thống an toàn SAS cải tiến. 7 series rẻ hơn, kết cấu đơn giản, phụ tùng rất phổ biến.',
      },
    ],
  },
  komatsu: {
    maker: 'KOMATSU',
    name: 'Komatsu',
    intro:
      'Komatsu là tập đoàn máy công trình hàng đầu Nhật Bản, xe nâng Komatsu nổi tiếng chắc chắn, khung gầm khỏe và khả năng làm việc nặng. Xe nâng Komatsu cũ là lựa chọn tốt cho nhà máy, bãi vật liệu cần độ bền cao với giá hợp lý.',
    series: [
      'Xe nâng điện: dòng FB (1–3 tấn), vận hành ổn định, bo điều khiển dễ bảo trì.',
      'Xe nâng dầu: dòng FD (1.5–5 tấn), động cơ Komatsu/Yanmar mạnh mẽ, phù hợp bãi ngoài trời.',
      'Xe nâng xăng/gas: dòng FG cho xưởng thông thoáng cần chạy cả ngày.',
    ],
    faq: [
      {
        q: 'Phụ tùng xe nâng Komatsu có dễ tìm không?',
        a: 'Có. Komatsu có mặt lâu năm tại Việt Nam, các chi tiết hao mòn như lọc, má phanh, xích nâng, con lăn đều có sẵn hàng chính hãng lẫn tương đương.',
      },
    ],
  },
  nichiyu: {
    maker: 'NICHIYU',
    name: 'Nichiyu',
    intro:
      'Nichiyu là hãng Nhật chuyên sâu về xe nâng điện, đặc biệt nổi tiếng với xe đứng lái (reach truck). Hiện Nichiyu thuộc Mitsubishi Logisnext cùng với TCM. Xe nâng Nichiyu cũ phù hợp kho kệ, kho lạnh và nhà xưởng cần xe điện bền, nâng cao.',
    series: [
      'Xe nâng điện đứng lái: dòng FBR (1–2.5 tấn), lối đi hẹp, nâng cao 5–7 m.',
      'Xe nâng điện ngồi lái: dòng FB (1–3 tấn), có bản 3 bánh và 4 bánh.',
      'Nhiều xe đứng lái có bản kho lạnh, chịu được môi trường nhiệt độ thấp.',
    ],
    faq: [
      {
        q: 'Xe nâng Nichiyu có phải hàng Mitsubishi không?',
        a: 'Nichiyu hợp nhất với TCM và nay thuộc Mitsubishi Logisnext (tập đoàn Mitsubishi Heavy Industries). Xe vẫn mang tên Nichiyu và là dòng chuyên về xe nâng điện.',
      },
    ],
  },
  sumitomo: {
    maker: 'SUMITOMO',
    name: 'Sumitomo',
    intro:
      'Xe nâng Sumitomo được sản xuất bởi liên doanh giữa tập đoàn Sumitomo (Nhật Bản) và NACCO (Mỹ). Xe nâng Sumitomo cũ có thiết kế chắc chắn, dễ bảo dưỡng và giá thường mềm hơn các thương hiệu phổ biến cùng tải trọng.',
    series: [
      'Xe nâng điện ngồi lái: dòng FB (1–2.5 tấn), phù hợp kho hàng, nhà xưởng.',
      'Xe nâng điện đứng lái cho kho kệ, lối đi hẹp.',
      'Xe nâng dầu / gas: dòng FD / FG cho bãi ngoài trời.',
    ],
    faq: [
      {
        q: 'Xe nâng Sumitomo có bền như Toyota không?',
        a: 'Xe nâng Sumitomo sản xuất tại Nhật với tiêu chuẩn tương đương; độ bền thực tế phụ thuộc chủ yếu vào lịch sử sử dụng và bảo dưỡng của từng xe. Lợi thế của Sumitomo là giá mua thường thấp hơn.',
      },
    ],
  },
  tcm: {
    maker: 'TCM',
    name: 'TCM',
    intro:
      'TCM là hãng xe nâng lâu đời của Nhật, mạnh về xe nâng dầu và xe nâng xăng/gas tải trung và nặng. Hiện TCM thuộc Mitsubishi Logisnext. Xe nâng TCM cũ được đánh giá cao nhờ khung nâng khỏe và động cơ bền.',
    series: [
      'Xe nâng dầu: dòng FD (1.5–5 tấn) cho bãi ngoài trời, tải nặng.',
      'Xe nâng xăng/gas: dòng FG / FHG cho xưởng sản xuất.',
      'Xe nâng điện: dòng FB / FHB cho kho trong nhà.',
    ],
    faq: [
      {
        q: 'TCM và Nichiyu có chung phụ tùng không?',
        a: 'Hai hãng nay cùng thuộc Mitsubishi Logisnext nhưng phần lớn dòng xe cũ vẫn dùng phụ tùng riêng. Khi mua, MCK sẽ cho biết mã phụ tùng hao mòn chính để bạn dễ thay thế.',
      },
    ],
  },
};

export const BRAND_SLUGS = Object.keys(BRAND_INFO);

export function brandSlugForMaker(maker: string): string | null {
  const m = maker.trim().toUpperCase();
  return BRAND_SLUGS.find((s) => BRAND_INFO[s].maker === m) ?? null;
}

export function brandPage(slug: string): LandingContent | null {
  const b = BRAND_INFO[slug.toLowerCase()];
  if (!b) return null;
  return {
    path: `/hang/${slug.toLowerCase()}`,
    filter: { kind: 'maker', maker: b.maker },
    label: { vi: `Xe nâng ${b.name} cũ`, en: `Used ${b.name} forklifts` },
    vi: {
      title: `Xe Nâng ${b.name} Cũ Nhật Bản – Giá Tốt, Có Sẵn Tại Kho`,
      description: `Xe nâng ${b.name} cũ nhập khẩu trực tiếp từ Nhật Bản: xe nâng điện, xe nâng dầu, xe nâng gas. Hình ảnh thật, giá công khai, đầy đủ giấy tờ nhập khẩu và hóa đơn VAT.`,
      h1: `Xe nâng ${b.name} cũ nhập khẩu Nhật Bản`,
      intro: [
        b.intro,
        `Danh sách bên dưới là các xe nâng ${b.name} cũ đang có tại kho Xe Nâng MCK, đang về hoặc còn ở Nhật Bản có thể đặt trước.`,
      ],
      sections: [
        { heading: `Các dòng xe nâng ${b.name} phổ biến`, bullets: b.series },
        {
          heading: `Lưu ý khi mua xe nâng ${b.name} cũ`,
          paragraphs: [
            `Đọc model trên tem xe để biết loại nhiên liệu và tải trọng (ví dụ ký hiệu FB là xe điện, FD là xe dầu, FG là xe xăng/gas, con số phía sau thường thể hiện tải trọng). Đối chiếu số khung với tờ khai hải quan và xem xe thực tế hoặc qua video trước khi đặt cọc.`,
          ],
        },
        { heading: 'Checklist trước khi mua', bullets: CHECKLIST_COMMON },
      ],
      faq: [
        ...b.faq,
        {
          q: `Mua xe nâng ${b.name} cũ ở đâu uy tín?`,
          a: `Nên chọn đơn vị nhập khẩu trực tiếp, có kho xem xe thực tế, công khai giá và xuất hóa đơn VAT. Xe Nâng MCK có kho tại Hưng Yên, bạn có thể đến xem và chạy thử trước khi mua.`,
        },
      ],
    },
    en: {
      title: `Used ${b.name} Forklifts from Japan`,
      description: `Used ${b.name} forklifts imported directly from Japan: electric, diesel and LPG. Real photos, published prices, customs papers and VAT invoice.`,
      h1: `Used ${b.name} forklifts imported from Japan`,
      intro: [`Every used ${b.name} forklift we have in stock, in transit or reservable in Japan.`],
    },
  };
}

/** Tất cả trang đích (dùng cho sitemap, footer, liên kết nội bộ). */
export function allLandingPages(): LandingContent[] {
  return [
    POWER_PAGES.electric,
    POWER_PAGES.japan,
    POWER_PAGES.diesel,
    POWER_PAGES.gas,
    ...BRAND_SLUGS.map((s) => brandPage(s)!),
  ];
}
