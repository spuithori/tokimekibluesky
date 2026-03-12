const segmenter = new Intl.Segmenter();

export function graphemeLen(str: string): number {
	let length = 0;
	for (const _ of segmenter.segment(str)) length++;
	return length;
}
