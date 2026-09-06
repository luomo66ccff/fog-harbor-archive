import type { ClaimDefinition, ClaimId } from "@/types/investigation";

export const mainClaimIds = [
  "clock-fabrication",
  "heron-coverup",
  "ladder-escape",
] as const satisfies readonly ClaimId[];

export const claimDefinitions = [
  {
    id: "clock-fabrication",
    title: "时间作伪",
    question: "暴雨口径与十一分钟偏移是怎样形成的？",
    propositions: [
      {
        id: "manual-clock-and-weather-template",
        label: "周既明把港务主时钟人为快调十一分钟；“极端暴雨”是事后写入的统一封存口径。",
      },
      {
        id: "distributed-sensor-drift",
        label: "AWS、岸钟与通信节点发生同源漂移，系统科只是按故障时间补录。",
      },
      {
        id: "shore-clock-slow",
        label: "机械岸钟慢了十一分钟，港务系统时间正确；暴雨记录只是仪器漏报。",
      },
    ],
    rebuttal: {
      evidenceId: "ev-duty",
      text: "手写签到表显示 00:42，似乎支持港务系统时间。",
      choices: [
        { id: "accept-official", label: "以手写签到为独立真时钟" },
        { id: "cross-check", label: "保留为受污染记录，以岸钟、AWS 与管理员会话校验" },
        { id: "discard", label: "整份删除，不纳入论证" },
      ],
    },
  },
  {
    id: "heron-coverup",
    title: "白鹭七号靠泊掩盖",
    question: "白鹭七号在第七码头做了什么，记录为何被改写？",
    propositions: [
      {
        id: "hazmat-and-coordinated-coverup",
        label: "H-1707 卸下 12.1 吨含汞声呐污泥；周既明主导时间作伪，付款记录将周、顾与掩盖链相连。",
      },
      {
        id: "legal-calibration-cargo",
        label: "货物是合法盐度校准砝码，付款属于临时维修结算，船号擦除只是行政疏漏。",
      },
      {
        id: "gu-solo-smuggling",
        label: "顾惟安独自放入一艘普通走私船，周既明和栖潮计划与此无关。",
      },
    ],
    rebuttal: {
      evidenceId: "ev-case-file",
      text: "官方结案摘要称没有船只靠泊，事件只是暴雨落水。",
      choices: [
        { id: "accept-official", label: "官方结案优先，降级其他材料" },
        { id: "cross-check", label: "保留摘要为反方材料，以原始无雨记录与靠泊物证冲突证明其受污染" },
        { id: "discard", label: "删除结案摘要，避免影响结论" },
      ],
    },
  },
  {
    id: "ladder-escape",
    title: "梯道接应",
    question: "00:43 之后，林知夏与照片中的第二道人影发生了什么？",
    propositions: [
      {
        id: "planned-maintenance-escape",
        label: "林知夏按预先约定的三敲暗号抵达外侧梯；许晚澄延迟巡检，陈牧以 M-4 检修艇将她带离港区。",
      },
      {
        id: "chen-was-pursuer",
        label: "第二道人影是追捕林知夏的陈牧；工具箱证明他参与拦截，后续离港记录是伪造。",
      },
      {
        id: "fatal-accident",
        label: "林知夏在争执后意外落水身亡，三敲和报警关闭只是无关的夜班维护噪声。",
      },
    ],
    rebuttal: {
      evidenceId: "ev-photo",
      text: "完整照片只能看到第二道人影靠近水线，轮廓也可以解释为追捕。",
      choices: [
        { id: "accept-official", label: "用轮廓直接认定陈牧追捕" },
        { id: "cross-check", label: "只用照片确认在场与位置，把动机和后续动作交给三敲、126 秒窗口、M-4 应答及工具箱交叉判断" },
        { id: "discard", label: "照片过于模糊，完全排除" },
      ],
    },
  },
  {
    id: "archive02-continuity",
    title: "ARCHIVE-02 连续性",
    question: "ARCHIVE-02 与 2019 年的封存系统是什么关系？",
    propositions: [
      {
        id: "active-purge-network-node",
        label: "ARCHIVE-02 是栖潮监控与销毁体系仍在运行的节点，沿用 2019 年作业指纹；当前操作者仍不确定。",
      },
      {
        id: "tide0-personal-reader",
        label: "第二读取游标就是林知夏的潮汐_0 终端，不存在第三方监控。",
      },
      {
        id: "benign-backup-replica",
        label: "ARCHIVE-02 只是普通容灾副本，与 2019 年封存作业没有关系。",
      },
    ],
    rebuttal: {
      evidenceId: "ev-commission",
      text: "匿名委托称潮汐_0 能从备份节点看见调查进度，似乎足以解释第二游标。",
      choices: [
        { id: "accept-official", label: "把潮汐_0 与 ARCHIVE-02 视为同一读取者" },
        { id: "cross-check", label: "用声纹确认委托人，再以会话来源和销毁器指纹区分潮汐_0 与第二游标" },
        { id: "discard", label: "认定匿名委托伪造并排除" },
      ],
    },
  },
] as const satisfies readonly ClaimDefinition[];
