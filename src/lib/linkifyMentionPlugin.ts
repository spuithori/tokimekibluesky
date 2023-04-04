import { createTokenClass, registerPlugin } from 'linkifyjs';

const MentionToken = createTokenClass('mention', {
    isLink: true,
    toHref() {
        return '/' + this.toString().slice(1);
    }
});

registerPlugin('mention', ({ scanner, parser }) => {
    const { DOT, HYPHEN, SLASH, UNDERSCORE, AT } = scanner.tokens;
    const { domain } = scanner.tokens.groups;

    // @
    const At = parser.start.tt(AT); // @

    // Begin with hyphen (not mention unless contains other characters)
    const AtHyphen = At.tt(HYPHEN);
    AtHyphen.tt(HYPHEN, AtHyphen);

    // Valid mention (not made up entirely of symbols)
    const Mention = At.tt(UNDERSCORE, MentionToken);

    At.ta(domain, Mention);
    AtHyphen.tt(UNDERSCORE, Mention);
    AtHyphen.ta(domain, Mention);

    // More valid mentions
    Mention.ta(domain, Mention);
    Mention.tt(HYPHEN, Mention);
    Mention.tt(UNDERSCORE, Mention);

    // Mention with a divider
    const MentionDivider = Mention.tt(SLASH);

    // Once we get a word token, mentions can start up again
    MentionDivider.ta(domain, Mention);
    MentionDivider.tt(UNDERSCORE, Mention);
    MentionDivider.tt(HYPHEN, Mention);

    // ADDED: . transitions
    const MentionDot = Mention.tt(DOT);
    MentionDot.ta(domain, Mention);
    MentionDot.tt(HYPHEN, Mention);
    MentionDot.tt(UNDERSCORE, Mention);

})