export async function transformImageFilter(file: File) {
    return new Promise(resolve => {
        if (!/image\/gif/.test(file.type)) {
            return resolve(false);
        }

        const reader = new FileReader();
        reader.onload = () => {
            // @ts-ignore
            let arr = new Uint8Array(reader.result),
                i, len, length = arr.length, frames = 0;

            // make sure it's a gif (GIF8)
            if (arr[0] !== 0x47 || arr[1] !== 0x49 ||
                arr[2] !== 0x46 || arr[3] !== 0x38) {
                // it's not a gif, we can safely transform it
                return resolve(false);
            }

            for (i = 0, len = length - 9; i < len && frames < 2; ++i) {
                if (arr[i] === 0x00 && arr[i + 1] === 0x21 &&
                    arr[i + 2] === 0xF9 && arr[i + 3] === 0x04 &&
                    arr[i + 8] === 0x00 &&
                    (arr[i + 9] === 0x2C || arr[i + 9] === 0x21)) {
                    frames++;
                }
            }

            // if frame count > 1, it's animated, don't transform
            if (frames > 1) {
                return resolve(true);
            }

            // do transform
            return resolve(false);
        }
        reader.readAsArrayBuffer(file);
    });
}

export const acceptedImageType = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

export async function getImageSize (image: File) {
    return new Promise((resolve, reject) => {
        try {
            const fileReader = new FileReader();
            fileReader.onload = () => {
                const img: HTMLImageElement = new Image();

                img.onload = () => {
                    resolve({ width: img.width, height: img.height });
                }
                img.src = fileReader.result as string;
            }

            fileReader.readAsDataURL(image);
        } catch (e) {
            reject(e);
        }
    })
}

export function resizeAspectRatioSize (size: {width: number, height: number}) {
    if (size.width > 2000 || size.height > 2000) {
        let ratio = size.width / size.height;

        if (size.width > 2000) {
            size.width = 2000;
            size.height = size.width / ratio;
        }

        if (size.height > 2000) {
            size.height = 2000;
            size.width = size.height * ratio;
        }
    }

    return size;
}