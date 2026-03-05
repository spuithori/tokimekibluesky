export type ReportSubjectType = 'account' | 'post' | 'list' | 'feed' | 'starterPack' | 'convoMessage';

export type ReportSubjectData =
  | { type: 'account'; did: string }
  | { type: 'post'; uri: string; cid: string }
  | { type: 'list'; uri: string; cid: string }
  | { type: 'feed'; uri: string; cid: string }
  | { type: 'starterPack'; uri: string; cid: string }
  | { type: 'convoMessage'; convoId: string; messageId: string; did: string };

export type ReportModalState = {
  open: boolean;
  data: ReportSubjectData | undefined;
};

export type ReportCategory = {
  id: string;
  i18nKey: string;
  descriptionKey: string;
  reasons: ReportReason[];
};

export type ReportReason = {
  id: string;
  i18nKey: string;
  reasonType: string;
  legacyReasonType: string;
  bskyLabelerOnly?: boolean;
};
