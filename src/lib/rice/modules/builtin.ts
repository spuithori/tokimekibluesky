import type { RiceModuleManifest } from './types';
import { clockManifest } from './clock/manifest';
import { auroraManifest } from './aurora/manifest';
import { notificationsManifest } from './notifications/manifest';
import { chatManifest } from './chat/manifest';
import { accountManifest } from './account/manifest';
import { workspaceManifest } from './workspace/manifest';
import { dummyTimelineManifest } from './dummytimeline/manifest';
import { widgetsManifest } from './widgets/manifest';
import { searchManifest } from './search/manifest';
import { feedsManifest } from './feeds/manifest';
import { trendsManifest } from './trends/manifest';
import { columnManifest } from './column/manifest';
import { keymodeManifest } from './keymode/manifest';

export const builtinModules: RiceModuleManifest[] = [
    clockManifest,
    dummyTimelineManifest,
    auroraManifest,
    notificationsManifest,
    chatManifest,
    accountManifest,
    workspaceManifest,
    widgetsManifest,
    searchManifest,
    feedsManifest,
    trendsManifest,
    columnManifest,
    keymodeManifest,
];
