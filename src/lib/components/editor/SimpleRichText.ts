import {AppBskyRichtextFacet, AtpAgent, RichText} from "@atproto/api";
import {detectFacets} from "@atproto/api/src/rich-text/detection";
const facetSort = (a, b) => a.index.byteStart - b.index.byteStart

export class SimpleRichText extends RichText {
    async detectFacetsWithoutLinks(agent: AtpAgent) {
        this.facets = detectFacets(this.unicodeText);
        if (this.facets) {
            this.facets = this.facets.filter(facet => {
                return facet.features[0].$type !== 'app.bsky.richtext.facet#link'
            });

            for (const facet of this.facets) {
                for (const feature of facet.features) {
                    if (AppBskyRichtextFacet.isMention(feature)) {
                        const did = await agent
                            .resolveHandle({handle: feature.did})
                            .catch((_) => undefined)
                            .then((res) => res?.data.did);
                        feature.did = did || '';
                    }
                }
            }
            this.facets.sort(facetSort);
        }
    }
}
