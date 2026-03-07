import { detectFacets } from './detection';
import { sanitizeRichText } from './sanitization';
import { UnicodeString } from './unicode';

export interface Facet {
	$type?: string;
	index: { byteStart: number; byteEnd: number };
	features: Array<{ $type: string; [key: string]: any }>;
}

export type FacetLink = { $type: string; uri: string };
export type FacetMention = { $type: string; did: string };
export type FacetTag = { $type: string; tag: string };

interface Entity {
	type: string;
	index: { start: number; end: number };
	value: string;
}

export interface RichTextProps {
	text: string;
	facets?: Facet[];
	entities?: Entity[];
}

export interface RichTextOpts {
	cleanNewlines?: boolean;
}

function isLink(feature: any): feature is FacetLink {
	return feature?.$type === 'app.bsky.richtext.facet#link';
}

function isMention(feature: any): feature is FacetMention {
	return feature?.$type === 'app.bsky.richtext.facet#mention';
}

function isTag(feature: any): feature is FacetTag {
	return feature?.$type === 'app.bsky.richtext.facet#tag';
}

export class RichTextSegment {
	constructor(
		public text: string,
		public facet?: Facet
	) {}

	get link(): FacetLink | undefined {
		return this.facet?.features.find(isLink);
	}

	isLink() {
		return !!this.link;
	}

	get mention(): FacetMention | undefined {
		return this.facet?.features.find(isMention);
	}

	isMention() {
		return !!this.mention;
	}

	get tag(): FacetTag | undefined {
		return this.facet?.features.find(isTag);
	}

	isTag() {
		return !!this.tag;
	}
}

export class RichText {
	unicodeText: UnicodeString;
	facets?: Facet[];

	constructor(props: RichTextProps, opts?: RichTextOpts) {
		this.unicodeText = new UnicodeString(props.text);
		this.facets = props.facets;
		if (!this.facets?.length && props.entities?.length) {
			this.facets = entitiesToFacets(this.unicodeText, props.entities);
		}
		if (this.facets) {
			this.facets = this.facets.filter(facetFilter).sort(facetSort);
		}
		if (opts?.cleanNewlines) {
			sanitizeRichText(this, { cleanNewlines: true }).copyInto(this);
		}
	}

	get text() {
		return this.unicodeText.toString();
	}

	get length() {
		return this.unicodeText.length;
	}

	get graphemeLength() {
		return this.unicodeText.graphemeLength;
	}

	clone() {
		return new RichText({
			text: this.unicodeText.utf16,
			facets: cloneDeep(this.facets)
		});
	}

	copyInto(target: RichText) {
		target.unicodeText = this.unicodeText;
		target.facets = cloneDeep(this.facets);
	}

	*segments(): Generator<RichTextSegment, void, void> {
		const facets = this.facets || [];
		if (!facets.length) {
			yield new RichTextSegment(this.unicodeText.utf16);
			return;
		}

		let textCursor = 0;
		let facetCursor = 0;
		do {
			const currFacet = facets[facetCursor];
			if (textCursor < currFacet.index.byteStart) {
				yield new RichTextSegment(
					this.unicodeText.slice(textCursor, currFacet.index.byteStart)
				);
			} else if (textCursor > currFacet.index.byteStart) {
				facetCursor++;
				continue;
			}
			if (currFacet.index.byteStart < currFacet.index.byteEnd) {
				const subtext = this.unicodeText.slice(
					currFacet.index.byteStart,
					currFacet.index.byteEnd
				);
				if (!subtext.trim()) {
					yield new RichTextSegment(subtext);
				} else {
					yield new RichTextSegment(subtext, currFacet);
				}
			}
			textCursor = currFacet.index.byteEnd;
			facetCursor++;
		} while (facetCursor < facets.length);
		if (textCursor < this.unicodeText.length) {
			yield new RichTextSegment(
				this.unicodeText.slice(textCursor, this.unicodeText.length)
			);
		}
	}

	insert(insertIndex: number, insertText: string) {
		this.unicodeText = new UnicodeString(
			this.unicodeText.slice(0, insertIndex) +
				insertText +
				this.unicodeText.slice(insertIndex)
		);

		if (!this.facets?.length) {
			return this;
		}

		const numCharsAdded = insertText.length;
		for (const ent of this.facets) {
			if (insertIndex <= ent.index.byteStart) {
				ent.index.byteStart += numCharsAdded;
				ent.index.byteEnd += numCharsAdded;
			} else if (insertIndex >= ent.index.byteStart && insertIndex < ent.index.byteEnd) {
				ent.index.byteEnd += numCharsAdded;
			}
		}
		return this;
	}

	delete(removeStartIndex: number, removeEndIndex: number) {
		this.unicodeText = new UnicodeString(
			this.unicodeText.slice(0, removeStartIndex) +
				this.unicodeText.slice(removeEndIndex)
		);

		if (!this.facets?.length) {
			return this;
		}

		const numCharsRemoved = removeEndIndex - removeStartIndex;
		for (const ent of this.facets) {
			if (removeStartIndex <= ent.index.byteStart && removeEndIndex >= ent.index.byteEnd) {
				ent.index.byteStart = 0;
				ent.index.byteEnd = 0;
			} else if (removeStartIndex > ent.index.byteEnd) {
				// noop
			} else if (
				removeStartIndex > ent.index.byteStart &&
				removeStartIndex <= ent.index.byteEnd &&
				removeEndIndex > ent.index.byteEnd
			) {
				ent.index.byteEnd = removeStartIndex;
			} else if (
				removeStartIndex >= ent.index.byteStart &&
				removeEndIndex <= ent.index.byteEnd
			) {
				ent.index.byteEnd -= numCharsRemoved;
			} else if (
				removeStartIndex < ent.index.byteStart &&
				removeEndIndex >= ent.index.byteStart &&
				removeEndIndex <= ent.index.byteEnd
			) {
				ent.index.byteStart = removeStartIndex;
				ent.index.byteEnd -= numCharsRemoved;
			} else if (removeEndIndex < ent.index.byteStart) {
				ent.index.byteStart -= numCharsRemoved;
				ent.index.byteEnd -= numCharsRemoved;
			}
		}

		this.facets = this.facets.filter((ent) => ent.index.byteStart < ent.index.byteEnd);
		return this;
	}

	async detectFacets(resolveHandle: (handle: string) => Promise<string | undefined>) {
		this.facets = detectFacets(this.unicodeText);
		if (this.facets) {
			const promises: Promise<void>[] = [];
			for (const facet of this.facets) {
				for (const feature of facet.features) {
					if (isMention(feature)) {
						promises.push(
							resolveHandle(feature.did)
								.catch(() => undefined)
								.then((did) => {
									feature.did = did || '';
								})
						);
					}
				}
			}
			await Promise.allSettled(promises);
			this.facets.sort(facetSort);
		}
	}

	detectFacetsWithoutResolution() {
		this.facets = detectFacets(this.unicodeText);
		if (this.facets) {
			this.facets.sort(facetSort);
		}
	}
}

const facetSort = (a: Facet, b: Facet) => a.index.byteStart - b.index.byteStart;

const facetFilter = (facet: Facet) => facet.index.byteStart <= facet.index.byteEnd;

function entitiesToFacets(text: UnicodeString, entities: Entity[]): Facet[] {
	const facets: Facet[] = [];
	for (const ent of entities) {
		if (ent.type === 'link') {
			facets.push({
				$type: 'app.bsky.richtext.facet',
				index: {
					byteStart: text.utf16IndexToUtf8Index(ent.index.start),
					byteEnd: text.utf16IndexToUtf8Index(ent.index.end)
				},
				features: [{ $type: 'app.bsky.richtext.facet#link', uri: ent.value }]
			});
		} else if (ent.type === 'mention') {
			facets.push({
				$type: 'app.bsky.richtext.facet',
				index: {
					byteStart: text.utf16IndexToUtf8Index(ent.index.start),
					byteEnd: text.utf16IndexToUtf8Index(ent.index.end)
				},
				features: [{ $type: 'app.bsky.richtext.facet#mention', did: ent.value }]
			});
		}
	}
	return facets;
}

function cloneDeep<T>(v: T): T {
	if (typeof v === 'undefined') {
		return v;
	}
	return JSON.parse(JSON.stringify(v));
}
