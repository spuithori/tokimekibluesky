import type { AI_POLICY_SECTIONS, AiFeatureId } from './ai-policy';

type AiPolicySection = (typeof AI_POLICY_SECTIONS)[number];

export type AiPolicyFeatureCopy = {
    name: string;
    data: string;
    trigger: string;
    purpose: string;
    retention: string;
};

export type AiPolicyCopy = {
    title: string;
    updated: string;
    intro: string;
    columns: Record<'feature' | 'data' | 'trigger' | 'purpose' | 'retention' | 'model', string>;
    features: Record<AiFeatureId, AiPolicyFeatureCopy>;
    notSent: string;
    sections: Record<AiPolicySection, { title: string; body: string }>;
};

const JA_COPY: AiPolicyCopy = {
    title: 'TOKIMEKI AI 利用ポリシー・利用規約',
    updated: 'バージョン',
    intro:
        'この文書は、TOKIMEKI（当アプリ）のAI関連機能（以下、TOKIMEKI AI）におけるデータの取扱いと利用条件を、当アプリの通常利用に適用されるプライバシーポリシーとは別に定めるものです。TOKIMEKI AIは初期状態では無効です。',
    columns: {
        feature: '機能',
        data: '送信するデータ',
        trigger: '送信のタイミング',
        purpose: '目的と結果',
        retention: '保持',
        model: 'AIモデル(随時更新)',
    },
    features: {
        altText: {
            name: '画像ALTの自動生成',
            data: 'AIボタンを押した画像(送信前に縮小・圧縮したもの)と、出力に使う言語の設定',
            trigger: 'あなたがAIボタンを押した時だけ',
            purpose: '画像内の文字の抽出、または説明文の生成。結果はALTの入力欄に入るだけで、投稿前に自由に編集・削除できます',
            retention: '保存しません',
        },
        columnIcon: {
            name: '自動カラムアイコン選択',
            data: '追加するカスタムフィードの名前(最大100文字)と説明文(最大300文字)。いずれもフィードの作成者が公開している情報です',
            trigger: '機能を有効にした状態で、カスタムフィードのカラムを追加した時',
            purpose: 'あらかじめ用意されたアイコンの一覧から1つを選びます。AIが返すのはアイコンの名前だけで、確信が低い場合は何も選びません。選ばれたアイコンはいつでも手動で変更できます',
            retention: '判定結果(アイコンの名前)をCDNに最大30日間キャッシュします。キャッシュのキーはフィードの名前と説明文で、利用者を識別する情報を含みません',
        },
    },
    notSent: 'あなたのDID・ハンドル・投稿本文・フォロー関係・その他の設定内容は送信しません。AIが投稿・編集・削除などの操作を行うことはありません。',
    sections: {
        choice: {
            title: '1. 明示的な選択',
            body: 'TOKIMEKI AIはオプトイン（明示的な同意がある場合のみ有効）です。当アプリの利用やプライバシーポリシーへの同意だけでは有効になりません。設定画面でこの文書を確認し、専用のチェックボックスで明示的に同意した場合に限り有効になります。',
        },
        features: {
            title: '2. 対象となる機能と送信するデータ',
            body: '対象は次の機能です。対象機能を追加する場合はこの文書を更新します。',
        },
        route: {
            title: '3. 送信経路と取扱い',
            body: 'データは当アプリのサーバーから Vercel AI Gateway を経由してAIモデルの提供元へ送信し、各リクエストで Zero Data Retention(ZDR) と学習利用禁止を要求します。これを満たす経路が無い場合は処理を失敗させ、AIによる結果は返しません。現在使用しているAIモデルとその提供元は、上の表の「AIモデル」欄に掲示します。AIモデルは、上記の条件を満たす範囲で変更することがあります。',
        },
        retention: {
            title: '4. 保持とキャッシュ',
            body: 'AI Gateway へ送信した入力と出力はZDRの対象となり、モデルの学習には利用されません。当アプリは送信された画像やテキスト、生成結果をデータベースへ保存しません。機能ごとの保持は上の表のとおりです。選ばれたアイコンは、あなたのカラム設定の一部として当アプリの設定と同じ場所に保存されます。',
        },
        terms: {
            title: '5. 利用条件',
            body: 'TOKIMEKI AIは実験的な機能です。生成・判定結果の正確さ、継続的な提供、特定の目的への適合を保証しません。予告なく内容を変更し、または提供を一時停止・終了することがあります。目的外利用は禁止し、判明した場合は利用停止などの措置を行う可能性があります。',
        },
        withdrawal: {
            title: '6. 無効化',
            body: '設定画面からいつでも無効にできます。無効にすると、その時点からデータの送信を行いません。すでに選ばれたアイコンはそのまま残り、手動で変更できます。',
        },
        changes: {
            title: '7. 文書の変更',
            body: '対象データ、利用目的、保持、モデル学習、外部提供、利用条件などの重要事項を変更する場合は本規約を随時改訂します。AIモデルの変更は、第3条の条件を満たす限り重要事項の変更にはあたらず、表の「AIモデル」欄の掲示を更新します。',
        },
        contact: {
            title: '8. お問い合わせ',
            body: 'TOKIMEKI AIにおけるデータの取扱いについては、本アプリ運営者へお問い合わせください。 @tokimeki.blue',
        },
    },
};

const EN_COPY: AiPolicyCopy = {
    title: 'TOKIMEKI AI Usage Policy and Terms',
    updated: 'Version',
    intro:
        'This document sets out how data is handled and the conditions of use for the AI features (hereinafter "TOKIMEKI AI") of TOKIMEKI ("the app"), separately from the privacy policy that applies to ordinary use of the app. TOKIMEKI AI is disabled by default.',
    columns: {
        feature: 'Feature',
        data: 'Data that is sent',
        trigger: 'When it is sent',
        purpose: 'Purpose and result',
        retention: 'Retention',
        model: 'AI model (updated as needed)',
    },
    features: {
        altText: {
            name: 'Automatic image ALT text',
            data: 'The image you pressed the AI button for (resized and compressed before sending) and the output language setting',
            trigger: 'Only when you press the AI button',
            purpose: 'Extracts the text in the image or generates a description. The result only fills the ALT field, and you can edit or delete it freely before posting',
            retention: 'Not stored',
        },
        columnIcon: {
            name: 'Automatic column icons',
            data: 'The name (up to 100 characters) and description (up to 300 characters) of the custom feed you are adding. Both are published by the feed\'s creator',
            trigger: 'When you add a custom feed column while the feature is enabled',
            purpose: 'Chooses one icon from a predefined list. The AI returns only the name of an icon, and chooses nothing when its confidence is low. You can change the chosen icon by hand at any time',
            retention: 'The result (the icon name) is cached on the CDN for up to 30 days. The cache key is the feed\'s name and description and contains nothing that identifies you',
        },
    },
    notSent: 'Your DID, handle, post text, follow graph and other settings are not sent. The AI never posts, edits or deletes anything.',
    sections: {
        choice: {
            title: '1. Explicit choice',
            body: 'TOKIMEKI AI is opt-in (enabled only with your explicit consent). Using the app or agreeing to the privacy policy does not enable it. It is enabled only when you review this document in the settings and explicitly agree with the dedicated checkbox.',
        },
        features: {
            title: '2. Covered features and the data that is sent',
            body: 'The following features are covered. This document will be updated when a feature is added.',
        },
        route: {
            title: '3. Route and handling',
            body: 'Data is sent from the app\'s server through Vercel AI Gateway to the provider of the AI model, and every request requires Zero Data Retention (ZDR) and prohibits use for training. If no route satisfies these requirements the request fails and no AI result is returned. The AI models currently in use and their providers are posted in the "AI model" column of the table above. AI models may be changed within the conditions above.',
        },
        retention: {
            title: '4. Retention and caching',
            body: 'Inputs and outputs sent to AI Gateway are covered by ZDR and are not used for model training. The app does not store the images or text that are sent, or the results, in a database. Retention for each feature is shown in the table above. The chosen icon is saved as part of your column settings, in the same place as your other settings in the app.',
        },
        terms: {
            title: '5. Conditions of use',
            body: 'TOKIMEKI AI is an experimental feature. No guarantee is given as to the accuracy of generated or judged results, continued availability or fitness for a particular purpose. It may be changed, suspended or ended without notice. Use outside its purpose is prohibited, and if such use is found, measures such as suspension of use may be taken.',
        },
        withdrawal: {
            title: '6. Turning it off',
            body: 'You can turn it off in the settings at any time. No data is sent from that moment on. Icons that were already chosen remain and can be changed by hand.',
        },
        changes: {
            title: '7. Changes to this document',
            body: 'These terms are revised as needed when material matters change, such as the data covered, the purpose, retention, model training, disclosure to third parties or the conditions of use. A change of AI model is not a material change as long as the conditions of section 3 are met; the "AI model" column of the table is updated instead.',
        },
        contact: {
            title: '8. Contact',
            body: 'For questions about how TOKIMEKI AI handles data, contact the operator of the app. @tokimeki.blue',
        },
    },
};

export function getAiPolicyCopy(locale: string | null | undefined): AiPolicyCopy {
    return locale?.startsWith('ja') ? JA_COPY : EN_COPY;
}
