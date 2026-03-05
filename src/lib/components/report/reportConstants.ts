import type { ReportCategory } from './reportTypes';
import { ToolsOzoneReportDefs } from '@atproto/api';

const {
  REASONMISLEADINGSPAM,
  REASONMISLEADINGSCAM,
  REASONMISLEADINGBOT,
  REASONMISLEADINGIMPERSONATION,
  REASONMISLEADINGELECTIONS,
  REASONMISLEADINGOTHER,
  REASONSEXUALUNLABELED,
  REASONSEXUALABUSECONTENT,
  REASONSEXUALNCII,
  REASONSEXUALDEEPFAKE,
  REASONSEXUALANIMAL,
  REASONSEXUALOTHER,
  REASONHARASSMENTTROLL,
  REASONHARASSMENTTARGETED,
  REASONHARASSMENTHATESPEECH,
  REASONHARASSMENTDOXXING,
  REASONHARASSMENTOTHER,
  REASONVIOLENCEANIMAL,
  REASONVIOLENCETHREATS,
  REASONVIOLENCEGRAPHICCONTENT,
  REASONVIOLENCEGLORIFICATION,
  REASONVIOLENCEEXTREMISTCONTENT,
  REASONVIOLENCETRAFFICKING,
  REASONVIOLENCEOTHER,
  REASONCHILDSAFETYCSAM,
  REASONCHILDSAFETYGROOM,
  REASONCHILDSAFETYPRIVACY,
  REASONCHILDSAFETYHARASSMENT,
  REASONCHILDSAFETYOTHER,
  REASONSELFHARMCONTENT,
  REASONSELFHARMED,
  REASONSELFHARMSTUNTS,
  REASONSELFHARMSUBSTANCES,
  REASONSELFHARMOTHER,
  REASONRULESITESECURITY,
  REASONRULEPROHIBITEDSALES,
  REASONRULEBANEVASION,
  REASONRULEOTHER,
  REASONOTHER,
} = ToolsOzoneReportDefs;

export const BSKY_LABELER_DID = 'did:plc:ar7c4by46qjdydhdevvrndac';

export const BSKY_LABELER_ONLY_SUBJECT_TYPES = ['convoMessage'];

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'misleading',
    i18nKey: 'report_cat_misleading',
    descriptionKey: 'report_cat_misleading_desc',
    reasons: [
      { id: 'spam', i18nKey: 'report_reason_spam', reasonType: REASONMISLEADINGSPAM, legacyReasonType: 'com.atproto.moderation.defs#reasonSpam' },
      { id: 'scam', i18nKey: 'report_reason_scam', reasonType: REASONMISLEADINGSCAM, legacyReasonType: 'com.atproto.moderation.defs#reasonMisleading' },
      { id: 'bot', i18nKey: 'report_reason_bot', reasonType: REASONMISLEADINGBOT, legacyReasonType: 'com.atproto.moderation.defs#reasonSpam' },
      { id: 'impersonation', i18nKey: 'report_reason_impersonation', reasonType: REASONMISLEADINGIMPERSONATION, legacyReasonType: 'com.atproto.moderation.defs#reasonMisleading' },
      { id: 'elections', i18nKey: 'report_reason_elections', reasonType: REASONMISLEADINGELECTIONS, legacyReasonType: 'com.atproto.moderation.defs#reasonMisleading' },
      { id: 'misleading_other', i18nKey: 'report_reason_misleading_other', reasonType: REASONMISLEADINGOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonMisleading' },
    ],
  },
  {
    id: 'adult_content',
    i18nKey: 'report_cat_adult_content',
    descriptionKey: 'report_cat_adult_content_desc',
    reasons: [
      { id: 'unlabeled', i18nKey: 'report_reason_unlabeled', reasonType: REASONSEXUALUNLABELED, legacyReasonType: 'com.atproto.moderation.defs#reasonSexual' },
      { id: 'abuse', i18nKey: 'report_reason_abuse', reasonType: REASONSEXUALABUSECONTENT, legacyReasonType: 'com.atproto.moderation.defs#reasonSexual' },
      { id: 'ncii', i18nKey: 'report_reason_ncii', reasonType: REASONSEXUALNCII, legacyReasonType: 'com.atproto.moderation.defs#reasonSexual' },
      { id: 'deepfake', i18nKey: 'report_reason_deepfake', reasonType: REASONSEXUALDEEPFAKE, legacyReasonType: 'com.atproto.moderation.defs#reasonSexual' },
      { id: 'animal_sexual', i18nKey: 'report_reason_animal_sexual', reasonType: REASONSEXUALANIMAL, legacyReasonType: 'com.atproto.moderation.defs#reasonSexual' },
      { id: 'adult_other', i18nKey: 'report_reason_adult_other', reasonType: REASONSEXUALOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonSexual' },
    ],
  },
  {
    id: 'harassment',
    i18nKey: 'report_cat_harassment',
    descriptionKey: 'report_cat_harassment_desc',
    reasons: [
      { id: 'troll', i18nKey: 'report_reason_troll', reasonType: REASONHARASSMENTTROLL, legacyReasonType: 'com.atproto.moderation.defs#reasonRude' },
      { id: 'targeted', i18nKey: 'report_reason_targeted', reasonType: REASONHARASSMENTTARGETED, legacyReasonType: 'com.atproto.moderation.defs#reasonRude' },
      { id: 'hate_speech', i18nKey: 'report_reason_hate_speech', reasonType: REASONHARASSMENTHATESPEECH, legacyReasonType: 'com.atproto.moderation.defs#reasonRude' },
      { id: 'doxxing', i18nKey: 'report_reason_doxxing', reasonType: REASONHARASSMENTDOXXING, legacyReasonType: 'com.atproto.moderation.defs#reasonRude' },
      { id: 'harassment_other', i18nKey: 'report_reason_harassment_other', reasonType: REASONHARASSMENTOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonRude' },
    ],
  },
  {
    id: 'violence',
    i18nKey: 'report_cat_violence',
    descriptionKey: 'report_cat_violence_desc',
    reasons: [
      { id: 'animal_violence', i18nKey: 'report_reason_animal_violence', reasonType: REASONVIOLENCEANIMAL, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'threats', i18nKey: 'report_reason_threats', reasonType: REASONVIOLENCETHREATS, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'graphic', i18nKey: 'report_reason_graphic', reasonType: REASONVIOLENCEGRAPHICCONTENT, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'glorification', i18nKey: 'report_reason_glorification', reasonType: REASONVIOLENCEGLORIFICATION, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'extremist', i18nKey: 'report_reason_extremist', reasonType: REASONVIOLENCEEXTREMISTCONTENT, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation', bskyLabelerOnly: true },
      { id: 'trafficking', i18nKey: 'report_reason_trafficking', reasonType: REASONVIOLENCETRAFFICKING, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'violence_other', i18nKey: 'report_reason_violence_other', reasonType: REASONVIOLENCEOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
    ],
  },
  {
    id: 'child_safety',
    i18nKey: 'report_cat_child_safety',
    descriptionKey: 'report_cat_child_safety_desc',
    reasons: [
      { id: 'csam', i18nKey: 'report_reason_csam', reasonType: REASONCHILDSAFETYCSAM, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation', bskyLabelerOnly: true },
      { id: 'grooming', i18nKey: 'report_reason_grooming', reasonType: REASONCHILDSAFETYGROOM, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation', bskyLabelerOnly: true },
      { id: 'child_privacy', i18nKey: 'report_reason_child_privacy', reasonType: REASONCHILDSAFETYPRIVACY, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'child_harassment', i18nKey: 'report_reason_child_harassment', reasonType: REASONCHILDSAFETYHARASSMENT, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'child_other', i18nKey: 'report_reason_child_other', reasonType: REASONCHILDSAFETYOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation', bskyLabelerOnly: true },
    ],
  },
  {
    id: 'self_harm',
    i18nKey: 'report_cat_self_harm',
    descriptionKey: 'report_cat_self_harm_desc',
    reasons: [
      { id: 'self_harm_content', i18nKey: 'report_reason_self_harm_content', reasonType: REASONSELFHARMCONTENT, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'eating_disorder', i18nKey: 'report_reason_eating_disorder', reasonType: REASONSELFHARMED, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'stunts', i18nKey: 'report_reason_stunts', reasonType: REASONSELFHARMSTUNTS, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'substances', i18nKey: 'report_reason_substances', reasonType: REASONSELFHARMSUBSTANCES, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'self_harm_other', i18nKey: 'report_reason_self_harm_other', reasonType: REASONSELFHARMOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
    ],
  },
  {
    id: 'site_rules',
    i18nKey: 'report_cat_site_rules',
    descriptionKey: 'report_cat_site_rules_desc',
    reasons: [
      { id: 'security', i18nKey: 'report_reason_security', reasonType: REASONRULESITESECURITY, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'prohibited_sales', i18nKey: 'report_reason_prohibited_sales', reasonType: REASONRULEPROHIBITEDSALES, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'ban_evasion', i18nKey: 'report_reason_ban_evasion', reasonType: REASONRULEBANEVASION, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
      { id: 'rule_other', i18nKey: 'report_reason_rule_other', reasonType: REASONRULEOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonViolation' },
    ],
  },
  {
    id: 'other',
    i18nKey: 'report_cat_other',
    descriptionKey: 'report_cat_other_desc',
    reasons: [
      { id: 'other', i18nKey: 'report_reason_other_general', reasonType: REASONOTHER, legacyReasonType: 'com.atproto.moderation.defs#reasonOther' },
    ],
  },
];

export const NEW_TO_OLD_REASONS_MAP: Record<string, string> = {};
for (const cat of REPORT_CATEGORIES) {
  for (const reason of cat.reasons) {
    NEW_TO_OLD_REASONS_MAP[reason.reasonType] = reason.legacyReasonType;
  }
}
