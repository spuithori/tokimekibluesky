import type { ReportSubjectData } from './reportTypes';
import { BSKY_LABELER_DID, NEW_TO_OLD_REASONS_MAP } from './reportConstants';

export function buildSubject(data: ReportSubjectData) {
  switch (data.type) {
    case 'account':
      return {
        $type: 'com.atproto.admin.defs#repoRef',
        did: data.did,
      };
    case 'post':
    case 'list':
    case 'feed':
    case 'starterPack':
      return {
        $type: 'com.atproto.repo.strongRef',
        uri: data.uri,
        cid: data.cid,
      };
    case 'convoMessage':
      return {
        $type: 'chat.bsky.convo.defs#messageRef',
        convoId: data.convoId,
        messageId: data.messageId,
        did: data.did,
      };
  }
}

export async function sendReport(
  agent: any,
  data: ReportSubjectData,
  reasonType: string,
  text: string,
  labelerDid?: string,
) {
  const subject = buildSubject(data);
  const targetDid = labelerDid || BSKY_LABELER_DID;

  const headers: Record<string, string> = {};
  if (targetDid !== BSKY_LABELER_DID) {
    headers['atproto-proxy'] = `${targetDid}#atproto_labeler`;
  }

  const finalReasonType = reasonType.startsWith('tools.ozone.report.defs#')
    ? reasonType
    : reasonType;

  try {
    return await agent.agent.api.com.atproto.moderation.createReport(
      {
        reasonType: finalReasonType,
        reason: text || undefined,
        subject: subject,
      },
      {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      },
    );
  } catch (e: any) {
    if (e?.status === 400 && reasonType.startsWith('tools.ozone.report.defs#')) {
      const legacyType = NEW_TO_OLD_REASONS_MAP[reasonType];
      if (legacyType) {
        return await agent.agent.api.com.atproto.moderation.createReport(
          {
            reasonType: legacyType,
            reason: text || undefined,
            subject: subject,
          },
          {
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          },
        );
      }
    }
    throw e;
  }
}

export async function getAvailableLabelers(agent: any, subscribedDids: string[]) {
  if (!subscribedDids.length) return [];

  try {
    const res = await agent.agent.api.app.bsky.labeler.getServices({
      dids: subscribedDids,
      detailed: true,
    });
    return res.data.views;
  } catch (e) {
    console.error('Failed to get labelers:', e);
    return [];
  }
}
