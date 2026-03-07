import {RichText, detectFacets} from "$lib/atproto-richtext";
import {detectCashtagFacets} from "$lib/cashtag";
const facetSort = (a, b) => a.index.byteStart - b.index.byteStart

export class SimpleRichText extends RichText {
    async detectFacetsWithoutLinks(agent: any) {
        this.facets = detectFacets(this.unicodeText);
        if (this.facets) {
            this.facets = this.facets.filter(facet => {
                return facet.features[0].$type !== 'app.bsky.richtext.facet#link'
            });

            for (const facet of this.facets) {
                for (const feature of facet.features) {
                    if (feature.$type === 'app.bsky.richtext.facet#mention') {
                        const did = await agent
                            .resolveHandle({handle: feature.did})
                            .catch((_) => undefined)
                            .then((res) => res?.data.did);
                        feature.did = did || '';
                    }
                }
            }
        }

        const cashtagFacets = detectCashtagFacets(this.unicodeText);
        if (cashtagFacets.length) {
            this.facets = [...(this.facets || []), ...cashtagFacets];
        }

        if (this.facets) {
            this.facets.sort(facetSort);
        }
    }
}
