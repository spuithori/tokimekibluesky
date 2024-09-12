import {getServiceAuthToken} from "$lib/util";
import type {Agent} from "$lib/agent";

export async function getUploadLimit(_agent: Agent) {
    const token = await getServiceAuthToken({lxm: 'app.bsky.video.getUploadLimits', aud: 'did:web:video.bsky.app'}, _agent);
    const res = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.getUploadLimits`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });
    return await res.json();
}

export async function getUploadStatus(jobId: string) {
    const res = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${jobId}`);
    const json = await res.json();
    return json.jobStatus;
}

export async function getIntervalProcessingUpload(jobId: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                const jobStatus = await getUploadStatus(jobId);
                const allowStatus = ['JOB_STATE_SCANNED', 'JOB_STATE_SCANNING', 'JOB_STATE_ENCODING', 'JOB_STATE_CREATED', 'JOB_STATE_ENCODED'];
                console.log(jobStatus);

                if (jobStatus.blob) {
                    resolve(jobStatus.blob);
                } else if (jobStatus.state !== 'JOB_STATE_FAILED') {
                    setTimeout(checkStatus, 1500);
                } else {
                    reject(new Error(`Job is in an unexpected state: ${jobStatus.state}`));
                }
            } catch (error) {
                reject(error);
            }
        };

        checkStatus();
    });
}