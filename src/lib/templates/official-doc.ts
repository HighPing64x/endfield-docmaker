import type { TemplateDefinition } from './types';
import type { Authority, IssuerKey, UploadedImage } from '$lib/types';
import { ISSUERS, getLogoScales, issuerExt, normalizeIssuerKey } from '$lib/constants';
import { m } from '$lib/paraglide/messages';
import {
  customStampExt,
  customWatermarkExt,
  prepareCustomStampAsset,
  prepareCustomWatermarkAsset,
  prepareWatermarkAsset
} from '$lib/typst.svelte';

type DateParts = { year: string; month: string; day: string };
type WatermarkIconSource = 'issuer' | 'selected' | 'custom';
type StampSource = 'authority' | 'selected' | 'custom';

export interface OfficialDocValues {
  issuer: IssuerKey;
  copyNo: string;
  confLevel: string;
  confPeriod: string;
  urgentLevel: string;
  issuerCode: string;
  authorities: Authority[];
  refNo: string;
  docTitle: string;
  mainRecipient: string;
  attachmentNote: string;
  cc: string;
  printer: string;
  issueDate: DateParts;
  printDate: DateParts;
  stampEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkIconSource: WatermarkIconSource;
  watermarkIssuer: IssuerKey;
  watermarkCustomImage: UploadedImage | null;
  stampSource: StampSource;
  stampIssuer: IssuerKey;
  stampCustomImage: UploadedImage | null;
  watermarkOpacity: string;
  watermarkWidth: string;
  watermarkYOffset: string;
  headerTopMm: string;
  redLineThicknessPt: string;
  docContent: string;
}

const escapeTypst = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const typstString = (value: unknown) => `"${escapeTypst(String(value ?? ''))}"`;

const optionalTypstString = (value: unknown) => {
  const s = String(value ?? '').trim();
  return s ? typstString(s) : 'none';
};

const parseNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const parseDate = (date: DateParts | undefined) => {
  const parts = date ?? { year: '150', month: '1', day: '1' };
  const year = parseInt(parts.year, 10);
  const month = parseInt(parts.month, 10);
  const day = parseInt(parts.day, 10);
  return {
    year: isNaN(year) || year <= 0 ? 150 : year,
    month: isNaN(month) || month < 1 || month > 12 ? 1 : month,
    day: isNaN(day) || day < 1 || day > 31 ? 1 : day
  };
};

const typstDate = (date: DateParts | undefined) => {
  const { year, month, day } = parseDate(date);
  return `datetime(year: ${year}, month: ${month}, day: ${day})`;
};

const safeFileName = (value: string) => value.replace(/[<>:"/\\|?*]/g, '').replaceAll('\n', '');

export const officialDocTemplate: TemplateDefinition = {
  id: 'official-doc',
  name: () => m.template_official_doc(),
  gridCols: 3,
  storageVersion: 7,
  fields: [
    {
      type: 'select',
      key: 'issuer',
      label: () => m.issuer(),
      placeholder: () => m.select_issuer(),
      options: ISSUERS.map((i) => ({
        value: i.key,
        label: () => m[`issuer_${i.key}`]()
      }))
    },
    {
      type: 'authorities',
      key: 'authorities',
      label: () => m.authorities(),
      maxItems: 9
    },
    {
      type: 'textarea',
      key: 'docTitle',
      label: () => m.doc_title(),
      minHeight: 0
    },
    {
      type: 'date',
      key: 'issueDate',
      label: () => m.issue_date(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'issuerCode',
      label: () => m.issuer_code(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'refNo',
      label: () => m.ref_no(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'copyNo',
      label: () => m.official_copy_no(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'confLevel',
      label: () => m.official_conf_level(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'confPeriod',
      label: () => m.official_conf_period(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'urgentLevel',
      label: () => m.official_urgent_level(),
      colspan: 1
    },
    {
      type: 'text',
      key: 'mainRecipient',
      label: () => m.official_main_recipient(),
      colspan: 2
    },
    {
      type: 'toggle',
      key: 'stampEnabled',
      label: () => m.official_stamp_enabled(),
      colspan: 1
    },
    {
      type: 'select',
      key: 'stampSource',
      label: () => m.official_stamp_source(),
      options: [
        { value: 'authority', label: () => m.official_icon_mode_authority() },
        { value: 'selected', label: () => m.official_icon_mode_selected() },
        { value: 'custom', label: () => m.official_icon_mode_custom() }
      ],
      colspan: 1
    },
    {
      type: 'select',
      key: 'stampIssuer',
      label: () => m.official_stamp_issuer(),
      options: ISSUERS.map((i) => ({
        value: i.key,
        label: () => m[`issuer_${i.key}`]()
      })),
      colspan: 1
    },
    {
      type: 'image-upload',
      key: 'stampCustomImage',
      label: () => m.official_stamp_image(),
      description: () => m.official_stamp_image_desc(),
      colspan: 3
    },
    {
      type: 'toggle',
      key: 'watermarkEnabled',
      label: () => m.official_watermark_enabled(),
      description: () => m.official_watermark_desc(),
      colspan: 1
    },
    {
      type: 'select',
      key: 'watermarkIconSource',
      label: () => m.official_watermark_source(),
      options: [
        { value: 'issuer', label: () => m.official_icon_mode_issuer() },
        { value: 'selected', label: () => m.official_icon_mode_selected() },
        { value: 'custom', label: () => m.official_icon_mode_custom() }
      ],
      colspan: 1
    },
    {
      type: 'select',
      key: 'watermarkIssuer',
      label: () => m.official_watermark_issuer(),
      options: ISSUERS.map((i) => ({
        value: i.key,
        label: () => m[`issuer_${i.key}`]()
      })),
      colspan: 1
    },
    {
      type: 'image-upload',
      key: 'watermarkCustomImage',
      label: () => m.official_watermark_image(),
      description: () => m.official_watermark_image_desc(),
      colspan: 3
    },
    {
      type: 'number',
      key: 'watermarkOpacity',
      label: () => m.official_watermark_opacity(),
      min: 0,
      max: 100,
      placeholder: '8',
      colspan: 1
    },
    {
      type: 'number',
      key: 'watermarkWidth',
      label: () => m.official_watermark_width(),
      min: 0,
      max: 100,
      placeholder: '40',
      colspan: 1
    },
    {
      type: 'number',
      key: 'watermarkYOffset',
      label: () => m.official_watermark_y_offset(),
      min: -100,
      max: 100,
      placeholder: '0',
      colspan: 1
    },
    {
      type: 'number',
      key: 'headerTopMm',
      label: () => m.official_header_top(),
      min: 0,
      max: 80,
      placeholder: '35',
      colspan: 1
    },
    {
      type: 'number',
      key: 'redLineThicknessPt',
      label: () => m.official_red_line_thickness(),
      min: 0,
      max: 10,
      placeholder: '3',
      colspan: 1
    },
    {
      type: 'text',
      key: 'attachmentNote',
      label: () => m.official_attachment_note(),
      colspan: 2
    },
    {
      type: 'text',
      key: 'cc',
      label: () => m.official_cc(),
      colspan: 2
    },
    {
      type: 'text',
      key: 'printer',
      label: () => m.official_printer(),
      colspan: 1
    },
    {
      type: 'date',
      key: 'printDate',
      label: () => m.official_print_date(),
      colspan: 1
    },
    {
      type: 'file-list',
      key: 'files',
      label: () => m.file_list()
    },
    {
      type: 'textarea',
      key: 'docContent',
      label: () => m.doc_content(),
      placeholder: () => m.doc_content_placeholder(),
      grow: true,
      minHeight: 40
    }
  ],
  defaults: () => ({
    issuer: ISSUERS[0].key as string,
    copyNo: '',
    confLevel: '',
    confPeriod: '',
    urgentLevel: '',
    issuerCode: 'XXXXX发',
    authorities: [
      { faction: ISSUERS[0].key, prefix: m[`prefix_${ISSUERS[0].key}`](), name: '纪律检查委员会' },
      { faction: ISSUERS[0].key, prefix: m[`prefix_${ISSUERS[0].key}`](), name: '人事管理局' }
    ] satisfies Authority[],
    refNo: '1',
    docTitle: '关于XXXXX相关人员人事管理\n违规问题的调查处理通报',
    mainRecipient: '各有关单位',
    attachmentNote: '',
    cc: '',
    printer: '',
    issueDate: { year: '152', month: '1', day: '29' },
    printDate: { year: '152', month: '1', day: '29' },
    stampEnabled: true,
    stampSource: 'authority',
    stampIssuer: ISSUERS[0].key as string,
    stampCustomImage: null,
    watermarkEnabled: true,
    watermarkIconSource: 'issuer',
    watermarkIssuer: ISSUERS[0].key as string,
    watermarkCustomImage: null,
    watermarkOpacity: '8',
    watermarkWidth: '40',
    watermarkYOffset: '0',
    headerTopMm: '35',
    redLineThicknessPt: '3',
    docContent: `\
近期，XXXXX组织对内部人事管理及人员资格审查工作开展专项巡查，经查发现，在张某某同志任职审核及后续管理工作中，李某某同志存在履责不严、监管失察等问题，相关行为违反组织人事管理工作制度，对组织管理规范性和公信力造成不良影响。为严肃工作纪律，规范管理程序，现将有关调查情况及处理决定通报如下：

= 经查核实的主要问题

== 任职审核程序执行不严

张某某同志多次跨地区任职期间，长期未按规定提交完整的学历成绩及学业认证材料。按照《XXXXX人员管理条例》相关要求，此类情况应立即启动材料复核程序并暂缓任职安排，但李某某同志未及时履行监管职责，该问题未得到有效处置。虽后续补充提交相关材料，审核结果合规，但程序执行的严肃性未得到重视，违反人事审核工作基本要求。

== 存在非正当干预审核工作行为

在核查及问询过程中，经多方印证、综合查实，张某某同志曾以非正式方式向人事工作人员施加压力，试图干预正常审核工作进程，该行为虽无书面记载，但经查证属实，已违反工作人员履职基本纪律要求。

本次事件并非单纯的材料提交疏漏问题，而是叠加监督缺位、程序执行不严、非正当干预审核等多重因素形成的人事管理违规问题，性质较为典型，需各单位引以为戒。

= 处理依据及决定

依据《XXXXX人员管理条例》第三章第4条、《XXXXX组织人事工作监督管理办法》相关规定，经XXXXX纪律检查委员会、人事管理局集体研究决定，对相关责任人作出如下处理：

== 张某某同志

其行为违反工作人员任职审核相关规定，且存在干预正常工作进程的违规行为，情节属实。自本通报发布之日起，撤销其"高级岗位"资格，调整至"普通岗位"序列管理，按普通岗位相关规定核定岗位待遇及工作权限。

== 李某某同志

其在人事审核工作中未严格履行监管职责，履责不严、监管失察，是本次违规问题发生的重要原因，情节属实。对其作出诫勉谈话处理，在全组织范围内予以通报批评，责令其作出书面深刻检查，限期整改履职中存在的问题，并将整改情况报纪律检查委员会及人事管理局备案。

= 工作要求

各单位要以本次事件为警示，切实强化组织人事管理工作责任，严格执行工作人员资格审查、任职审核等各项工作程序，做到材料审核全流程留痕、监管责任全覆盖落实。要加强工作人员纪律教育，引导全体人员自觉遵守工作纪律，坚决杜绝干预正常工作进程、违反审核程序等行为。各监督岗位人员要切实履行监管职责，强化工作全过程监督，对发现的问题及时处置、闭环管理。

本通报自发布之日起执行，请各单位严格遵照落实。
`
  }),
  prepareAssets: async (values: Record<string, unknown>) => {
    const v = values as unknown as OfficialDocValues;
    const watermarkOpacity = parseNumber(v.watermarkOpacity, 8, 0, 100);
    if (v.watermarkEnabled !== false) {
      if (v.watermarkIconSource === 'custom' && v.watermarkCustomImage) {
        await prepareCustomWatermarkAsset(v.watermarkCustomImage, watermarkOpacity);
      } else {
        const watermarkIssuer =
          v.watermarkIconSource === 'selected' ? v.watermarkIssuer : v.issuer;
        await prepareWatermarkAsset(normalizeIssuerKey(watermarkIssuer), watermarkOpacity);
      }
    }
    if (v.stampEnabled !== false && v.stampSource === 'custom' && v.stampCustomImage) {
      await prepareCustomStampAsset(v.stampCustomImage);
    }
  },
  generateTypstSource: (values: Record<string, unknown>) => {
    const v = values as unknown as OfficialDocValues;
    const issuer = normalizeIssuerKey(v.issuer);
    const issuerName = m[`issuer_${issuer}`]();
    const watermarkWidth = parseNumber(v.watermarkWidth, 40, 0, 100);
    const watermarkYOffset = parseNumber(v.watermarkYOffset, 0, -100, 100);
    const headerTopMm = parseNumber(v.headerTopMm, 35, 0, 80);
    const redLineThicknessPt = parseNumber(v.redLineThicknessPt, 3, 0, 10);
    const watermarkEnabled = v.watermarkEnabled !== false && watermarkWidth > 0;
    const copyNo = String(v.copyNo ?? '').trim()
      ? String(parseNumber(v.copyNo, 1, 1, 999999))
      : 'none';

    const stampImage =
      v.stampSource === 'custom' && v.stampCustomImage
        ? `image("stamp-custom.${customStampExt(v.stampCustomImage)}", width: 100%)`
        : 'none';

    const authEntries = (v.authorities ?? [])
      .filter((a: Authority) => a.name.trim() !== '')
      .map((a: Authority) => {
        const faction =
          v.stampSource === 'selected' ? normalizeIssuerKey(v.stampIssuer) : normalizeIssuerKey(a.faction);
        const prefixFaction = normalizeIssuerKey(a.faction);
        const prefix = a.prefix ?? m[`prefix_${prefixFaction}`]();
        return `(name: ${typstString(`${prefix}${a.name}`)}, icon: image("stamp-${faction}.${issuerExt(faction)}", width: ${getLogoScales()[faction] ?? 1} * 100%), stamp-image: ${stampImage})`;
      });

    const watermarkIssuer =
      v.watermarkIconSource === 'selected' ? normalizeIssuerKey(v.watermarkIssuer) : issuer;
    const watermarkExt =
      v.watermarkIconSource === 'custom' && v.watermarkCustomImage
        ? customWatermarkExt(v.watermarkCustomImage)
        : issuerExt(watermarkIssuer);
    const watermarkIcon = watermarkEnabled
      ? v.watermarkIconSource === 'custom' && v.watermarkCustomImage
        ? `image("watermark-custom.${watermarkExt}", width: 100%)`
        : `image("watermark-${watermarkIssuer}.${watermarkExt}", width: ${getLogoScales()[watermarkIssuer] ?? 1} * 100%)`
      : 'none';

    return `
#import "official-doc.typ": *

#show: official-doc.with(
  copy-no: ${copyNo},
  ref-no: ${typstString(v.refNo)},
  conf-level: ${optionalTypstString(v.confLevel)},
  conf-period: ${optionalTypstString(v.confPeriod)},
  urgen-level: ${optionalTypstString(v.urgentLevel)},
  authorities: (${authEntries.join(', ')},),
  watermark-icon: ${watermarkIcon},
  watermark-width: ${watermarkWidth}%,
  watermark-dy: ${watermarkYOffset}mm,
  stamp-enabled: ${v.stampEnabled === false ? 'false' : 'true'},
  issuer: ${typstString(issuerName)},
  issuer-code: ${optionalTypstString(v.issuerCode)},
  title: ${typstString(v.docTitle)},
  main-recipient: ${optionalTypstString(v.mainRecipient)},
  attachment-note: ${optionalTypstString(v.attachmentNote)},
  cc: ${optionalTypstString(v.cc)},
  printer: ${optionalTypstString(v.printer)},
  issue-date: ${typstDate(v.issueDate)},
  print-date: ${typstDate(v.printDate ?? v.issueDate)},
  header-top: ${headerTopMm}mm,
  red-line-thickness: ${redLineThicknessPt}pt,
  seed: ${Date.now()},
)

${v.docContent}
`;
  },
  getFileName: (values: Record<string, unknown>) => {
    const v = values as unknown as OfficialDocValues;
    const refPrefix = v.issuerCode || m[`issuer_${normalizeIssuerKey(v.issuer)}`]();
    return safeFileName(
      `${refPrefix}〔${v.issueDate.year}〕${v.refNo}号 ${v.docTitle.replaceAll('\n', '')}.pdf`
    );
  }
};
