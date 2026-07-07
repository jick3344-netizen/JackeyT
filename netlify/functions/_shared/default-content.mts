export const DEFAULT_CONTENT = {
  "version": "default",
  "status": "published",
  "updatedAt": "2026-06-25T00:00:00.000Z",
  "site": {
    "brandName": "老黄的品牌三问",
    "subtitle": "品牌战略诊断工具",
    "heroEyebrow": "品牌战略诊断工具",
    "heroTitle": "先把品牌讲明白，\\n再谈增长。",
    "heroLead": "这套工具只问三件事：你是谁，别人为什么选你，别人凭什么信你。填完问卷后，你会拿到一份能直接拿来改表达、补案例、调方向的诊断报告。",
    "primaryCta": "输入邀请码",
    "secondaryCta": "看看怎么判断",
    "heroImage": "/assets/brand-three-questions-hero.svg",
    "footerLeft": "老黄的品牌三问 · 品牌战略诊断工具",
    "footerRight": "仅限受邀用户访问",
    "consultationTitle": "看完报告，想继续往下走。",
    "consultationText": "扫码加老黄微信，备注“品牌三问”。如果你需要 1 对 1 梳理，我会先看你的报告，再判断该从哪里聊。",
    "consultationButton": "登记咨询意向",
    "wechatQr": "/assets/contact-placeholder.svg",
    "wechatNote": "扫码添加微信 · 请备注“品牌三问”",
    "methodTitle": "老黄只看三件事",
    "methodIntro": "定位说不清，价值就很难被选中。信任没有证据，承诺再好也悬。",
    "reportStripTitle": "报告会告诉你先改哪里"
  },
  "methods": [
    {
      "key": "positioning",
      "number": "01 / 35 分",
      "title": "品牌定位",
      "description": "看别人能不能一句话听懂你是谁、服务谁、想占什么位置。"
    },
    {
      "key": "value",
      "number": "02 / 35 分",
      "title": "品牌价值",
      "description": "看用户选你之后，能得到什么具体结果，而不是只听你说自己专业。"
    },
    {
      "key": "trust",
      "number": "03 / 30 分",
      "title": "品牌信任状",
      "description": "看案例、数据、评价和作品能不能撑住你的承诺。"
    }
  ],
  "brandTypes": {
    "personal": {
      "label": "个人品牌诊断",
      "tag": "PERSONAL BRAND",
      "title": "个人品牌诊断",
      "description": "适合创始人、顾问、讲师、内容创作者，以及想把专业能力讲清楚的人。",
      "selectTitle": "个人品牌",
      "selectDescription": "梳理你的专业身份、目标对象、价值表达和可信证据。",
      "bullets": [
        "专家、顾问与自由职业者",
        "创始人和企业管理者",
        "内容创作者与知识型 IP"
      ]
    },
    "corporate": {
      "label": "企业品牌诊断",
      "tag": "COMPANY BRAND",
      "title": "企业品牌诊断",
      "description": "适合新品牌、新业务和正在升级的企业。先看定位、价值和信任，再谈传播。",
      "selectTitle": "企业品牌",
      "selectDescription": "检查你的市场定位、客户价值、差异化和信任资产。",
      "bullets": [
        "初创与成长型企业",
        "新品牌、新产品与新业务",
        "成熟企业品牌升级"
      ]
    }
  },
  "questions": {
    "personal": [
      {
        "key": "contactName",
        "module": "联系信息",
        "kicker": "00 / 联系信息",
        "title": "你的姓名是？",
        "help": "用于标记并保存你的诊断报告。该信息不会参与品牌评分。",
        "type": "text",
        "placeholder": "请输入姓名"
      },
      {
        "key": "contactMethod",
        "module": "联系信息",
        "kicker": "00 / 联系信息",
        "title": "请留下你的联系方式。",
        "help": "可以填写手机号码或微信号，用于报告服务和后续咨询。",
        "type": "text",
        "placeholder": "请输入手机号码或微信号"
      },
      {
        "key": "email",
        "module": "联系信息",
        "kicker": "00 / 联系信息",
        "title": "请填写你的邮箱。",
        "help": "用于接收报告通知和找回诊断记录。",
        "type": "email",
        "placeholder": "name@example.com"
      },
      {
        "key": "stage",
        "module": "基础信息",
        "kicker": "01 / 当前阶段",
        "title": "你的个人品牌目前处于哪个阶段？",
        "help": "选择最接近当前实际情况的一项。",
        "type": "single",
        "options": [
          "尚未正式开始",
          "刚刚起步",
          "已有内容，但定位不清",
          "已有稳定业务",
          "正在升级或转型"
        ]
      },
      {
        "key": "identity",
        "module": "基础信息",
        "kicker": "01 / 专业身份",
        "title": "如果只能保留一个专业身份，你希望别人如何认识你？",
        "help": "请填写最核心的职业或专业身份，不需要写完整个人介绍。",
        "type": "textarea",
        "placeholder": "例如：帮助成长型企业建立品牌战略的咨询顾问。"
      },
      {
        "key": "audience",
        "module": "品牌定位",
        "kicker": "02 / 目标对象",
        "title": "你最希望被哪一类人认识和记住？",
        "help": "请描述具体的人群、角色、阶段或需求。越具体，诊断越有价值。",
        "type": "textarea",
        "placeholder": "例如：正在从专业岗位转向管理岗位、希望建立个人影响力的资深设计师。"
      },
      {
        "key": "problems",
        "module": "品牌定位",
        "kicker": "02 / 用户问题",
        "title": "这些人最需要解决的三个问题是什么？",
        "help": "不需要为了填满而编造，填写 1 到 3 项即可。",
        "type": "triple",
        "itemLabel": "问题",
        "firstPlaceholder": "例如：专业能力很强，但不知道如何清晰表达自己的价值。"
      },
      {
        "key": "difference",
        "module": "品牌定位",
        "kicker": "02 / 差异化",
        "title": "与同领域的人相比，你最重要的不同是什么？",
        "help": "尽量写具体的经历、方法、服务对象、观点或成果，不要只写“更专业”。",
        "type": "textarea",
        "placeholder": "例如：同时拥有企业经营与品牌咨询经历，能够把品牌问题转化为经营决策。"
      },
      {
        "key": "outcomes",
        "module": "品牌价值",
        "kicker": "03 / 用户结果",
        "title": "用户选择你之后，最重要的三个变化是什么？",
        "help": "描述用户获得的结果，而不只是你提供的服务内容。",
        "type": "triple",
        "itemLabel": "结果",
        "firstPlaceholder": "例如：能够用一句清晰的话说明自己的专业价值。"
      },
      {
        "key": "coreValue",
        "module": "品牌价值",
        "kicker": "03 / 核心价值",
        "title": "你提供的最核心价值更接近哪一种？",
        "help": "选择最主要的一项，后续报告会结合开放题判断其他价值。",
        "type": "single",
        "options": [
          "提升结果或效果",
          "节省时间",
          "降低成本",
          "降低风险",
          "提供更好体验",
          "增强信心或认同",
          "创造新的机会"
        ]
      },
      {
        "key": "consistency",
        "module": "品牌价值",
        "kicker": "03 / 表达一致性",
        "title": "主页简介、内容主题、产品服务和实际交付，是否在表达同一个专业身份？",
        "help": "这是你的主观判断，系统还会结合其他答案综合分析。",
        "type": "scale",
        "scaleLabels": [
          "尚未建立",
          "较不一致",
          "部分一致",
          "基本一致",
          "高度一致"
        ]
      },
      {
        "key": "trustAssets",
        "module": "品牌信任状",
        "kicker": "04 / 信任资产",
        "title": "目前最能证明你专业能力的是什么？",
        "help": "选择当前最有说服力的一类证据。",
        "type": "single",
        "options": [
          "专业履历或资质",
          "代表客户或项目",
          "可量化成果",
          "原创方法或作品",
          "客户评价与转介绍",
          "媒体、奖项或机构认可",
          "目前还缺少明确证据"
        ]
      },
      {
        "key": "cases",
        "module": "品牌信任状",
        "kicker": "04 / 代表案例",
        "title": "请列出最多三个能够代表你的案例或成果。",
        "help": "可以匿名填写。先写案例名称和结果，详细材料以后再补充。",
        "type": "triple",
        "itemLabel": "案例",
        "firstPlaceholder": "例如：为某成长企业重新梳理品牌定位，帮助销售团队统一价值表达。"
      },
      {
        "key": "trustSystem",
        "module": "品牌信任状",
        "kicker": "04 / 证据体系",
        "title": "你是否持续整理案例、评价、数据和专业内容？",
        "help": "判断信任资产是零散存在，还是已经形成可持续积累。",
        "type": "scale",
        "scaleLabels": [
          "尚未整理",
          "偶尔保存",
          "有部分积累",
          "定期整理",
          "已形成体系"
        ]
      },
      {
        "key": "consultationInterest",
        "module": "服务支持",
        "kicker": "05 / 服务支持",
        "title": "你是否需要老黄的 1 对 1 付费咨询服务？",
        "help": "此选项不影响诊断结果，仅用于了解你是否希望获得后续支持。",
        "type": "single",
        "options": [
          "暂不需要",
          "想先了解服务方式与价格",
          "需要，希望安排 1 对 1 沟通"
        ]
      }
    ],
    "corporate": [
      {
        "key": "contactName",
        "module": "联系信息",
        "kicker": "00 / 联系信息",
        "title": "联系人姓名是？",
        "help": "用于报告服务和后续沟通。该信息不会参与品牌评分。",
        "type": "text",
        "placeholder": "请输入联系人姓名"
      },
      {
        "key": "contactMethod",
        "module": "联系信息",
        "kicker": "00 / 联系信息",
        "title": "请留下联系人手机号或微信号。",
        "help": "用于报告服务和后续咨询。",
        "type": "text",
        "placeholder": "请输入手机号码或微信号"
      },
      {
        "key": "email",
        "module": "联系信息",
        "kicker": "00 / 联系信息",
        "title": "请填写联系邮箱。",
        "help": "用于接收报告通知和找回诊断记录。",
        "type": "email",
        "placeholder": "name@company.com"
      },
      {
        "key": "brandName",
        "module": "基础信息",
        "kicker": "01 / 品牌名称",
        "title": "企业或品牌名称是什么？",
        "help": "填写报告中希望显示的正式名称。",
        "type": "text",
        "placeholder": "请输入企业或品牌名称"
      },
      {
        "key": "stage",
        "module": "基础信息",
        "kicker": "01 / 发展阶段",
        "title": "企业品牌目前处于哪个阶段？",
        "help": "选择最接近当前业务和品牌状态的一项。",
        "type": "single",
        "options": [
          "新建品牌",
          "市场验证期",
          "快速成长阶段",
          "稳定经营阶段",
          "品牌升级阶段",
          "业务转型阶段"
        ]
      },
      {
        "key": "identity",
        "module": "基础信息",
        "kicker": "01 / 品类身份",
        "title": "客户最容易用什么品类或身份理解你的品牌？",
        "help": "请使用客户听得懂的名称，不要只填写工商经营范围。",
        "type": "textarea",
        "placeholder": "例如：为区域银行提供企业文化与品牌建设服务的咨询机构。"
      },
      {
        "key": "audience",
        "module": "品牌定位",
        "kicker": "02 / 目标客户",
        "title": "品牌最重要的目标客户是谁？",
        "help": "可以描述行业、规模、角色、地区、发展阶段或采购场景。",
        "type": "textarea",
        "placeholder": "例如：正在进行品牌升级的区域性金融机构管理层。"
      },
      {
        "key": "problems",
        "module": "品牌定位",
        "kicker": "02 / 客户问题",
        "title": "目标客户最需要解决的三个问题是什么？",
        "help": "填写 1 到 3 项即可，优先写对客户决策影响最大的问题。",
        "type": "triple",
        "itemLabel": "问题",
        "firstPlaceholder": "例如：品牌表达与业务战略脱节，内部与外部认知不一致。"
      },
      {
        "key": "difference",
        "module": "品牌定位",
        "kicker": "02 / 竞争差异",
        "title": "与主要竞争者相比，品牌最重要的不同是什么？",
        "help": "说明差异来自产品、技术、服务、效率、资源、文化或商业模式中的哪一部分。",
        "type": "textarea",
        "placeholder": "例如：既能完成战略咨询，也能把策略转化为可落地的组织与传播体系。"
      },
      {
        "key": "outcomes",
        "module": "品牌价值",
        "kicker": "03 / 客户结果",
        "title": "客户选择品牌后，能够获得哪三个具体结果？",
        "help": "尽量填写可观察或可验证的结果。",
        "type": "triple",
        "itemLabel": "结果",
        "firstPlaceholder": "例如：管理层和一线团队能够使用统一的品牌语言。"
      },
      {
        "key": "coreValue",
        "module": "品牌价值",
        "kicker": "03 / 核心价值",
        "title": "品牌的核心价值主要来自哪里？",
        "help": "选择最主要的一项。",
        "type": "single",
        "options": [
          "产品性能",
          "技术能力",
          "服务质量",
          "效率与便利",
          "成本优势",
          "安全与风险控制",
          "体验与情感认同",
          "资源或平台能力"
        ]
      },
      {
        "key": "consistency",
        "module": "品牌价值",
        "kicker": "03 / 价值兑现",
        "title": "品牌承诺能否被产品、流程和组织稳定兑现？",
        "help": "不要只判断宣传是否好听，要判断实际交付是否稳定。",
        "type": "scale",
        "scaleLabels": [
          "主要依赖个人",
          "经常不稳定",
          "部分可兑现",
          "基本稳定",
          "体系化保障"
        ]
      },
      {
        "key": "trustAssets",
        "module": "品牌信任状",
        "kicker": "04 / 信任资产",
        "title": "目前最能证明企业能力的是什么？",
        "help": "选择客户决策时最有说服力的一类证据。",
        "type": "single",
        "options": [
          "行业资质与认证",
          "代表客户与项目",
          "经营或成果数据",
          "专利与技术能力",
          "质量与服务体系",
          "客户评价与复购",
          "媒体、奖项或机构认可",
          "目前还缺少明确证据"
        ]
      },
      {
        "key": "cases",
        "module": "品牌信任状",
        "kicker": "04 / 代表案例",
        "title": "请列出最多三个代表客户、项目或成果。",
        "help": "可以匿名填写，先写合作内容和结果。",
        "type": "triple",
        "itemLabel": "案例",
        "firstPlaceholder": "例如：为某区域银行完成品牌体系升级，并应用于网点、传播与内部管理。"
      },
      {
        "key": "trustSystem",
        "module": "品牌信任状",
        "kicker": "04 / 证据体系",
        "title": "企业是否系统管理案例、评价、数据与第三方认可？",
        "help": "判断信任证据是否能够持续积累并用于销售和传播。",
        "type": "scale",
        "scaleLabels": [
          "没有管理",
          "零散保存",
          "部分整理",
          "定期维护",
          "形成完整体系"
        ]
      },
      {
        "key": "consultationInterest",
        "module": "服务支持",
        "kicker": "05 / 服务支持",
        "title": "是否需要老黄的 1 对 1 付费咨询服务？",
        "help": "此选项不影响诊断结果，仅用于了解你是否希望获得后续支持。",
        "type": "single",
        "options": [
          "暂不需要",
          "想先了解服务方式与价格",
          "需要，希望安排 1 对 1 沟通"
        ]
      }
    ]
  },
  "reportConfig": {
    "scoring": {
      "positioning": 35,
      "value": 35,
      "trust": 30
    },
    "model": "MiniMax-M3",
    "systemPrompt": "你是严谨、克制的中文品牌战略顾问。仅依据用户答案判断，不得虚构客户、成果、数据、资质或市场事实。",
    "generationTask": "生成品牌战略诊断报告",
    "levels": [
      {
        "min": 85,
        "label": "A 级 · 品牌引领"
      },
      {
        "min": 70,
        "label": "B 级 · 品牌成长"
      },
      {
        "min": 55,
        "label": "C 级 · 品牌成形"
      },
      {
        "min": 40,
        "label": "D 级 · 品牌模糊"
      },
      {
        "min": 0,
        "label": "E 级 · 品牌起步"
      }
    ],
    "sections": [
      "执行摘要",
      "品牌全景",
      "品牌定位诊断",
      "价值与信任诊断",
      "优先议题",
      "信任资料",
      "表达建议",
      "行动方案"
    ]
  }
} as const;

export type ContentConfig = typeof DEFAULT_CONTENT;
