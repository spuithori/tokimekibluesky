import { createGateway, experimental_evaluate as evaluate } from 'ai';
import { aiFeature } from '$lib/ai-policy';

const COLUMN_ICON_INSTRUCTIONS = 'The state describes a Bluesky custom feed by its name and description, written in any language. Pick the option whose subject is clearly the main topic of the feed. Pick "none" when the feed is general, mixed, personal, or no single option is clearly the main topic.';

export const COLUMN_ICON_CRITERIA = {
    cat: 'Cats',
    dog: 'Dogs',
    bird: 'Birds, birdwatching',
    fish: 'Fish, aquariums, fishing, marine life',
    pawprint: 'Animals, pets or wildlife in general, other than cats, dogs, birds or fish',
    gamepad: 'Video games, gaming, esports, game development',
    movie: 'Movies, TV series, anime, video content',
    music: 'Music, songs, artists, bands, instruments, concerts',
    mic: 'Podcasts, radio, voice acting, VTubers, live streaming',
    palette: 'Art, illustration, drawing, painting, fan art, design',
    camera: 'Photography, photographers, photo sharing',
    image: 'Feeds defined only by media type (posts with images or videos), without an art or photography subject',
    book: 'Books, reading, literature, manga, comics',
    pencil: 'Writing, blogging, poetry, journaling, authors',
    science: 'Science, research, academia, medicine, biology, chemistry, physics',
    rocket: 'Space, astronomy, rockets, the universe',
    cpu: 'Technology, programming, software development, computers, the AT Protocol or Bluesky development',
    bot: 'Artificial intelligence, machine learning, robots, bots',
    keyround: 'Security, privacy, infosec',
    newspaper: 'News, journalism, current events, headlines',
    landmark: 'Politics, government, law, elections, activism',
    chartspline: 'Finance, investing, stocks, crypto, economics, business',
    volleyball: 'Sports: soccer, baseball, basketball, and any other athletic competition',
    dumbbell: 'Fitness, workouts, running, health, wellness',
    dinner: 'Food, cooking, recipes, restaurants',
    coffee: 'Coffee, tea, cafes',
    beer: 'Alcohol: beer, wine, sake, bars',
    cake: 'Sweets, desserts, baking',
    tree: 'Nature, landscapes, plants, the environment, climate',
    rose: 'Flowers, gardening',
    tent: 'Camping, hiking, the outdoors',
    plane: 'Travel, tourism, aviation',
    car: 'Cars, automotive, motorsports',
    bike: 'Cycling, bicycles, motorcycles',
    mappin: 'A specific city or local region and its community',
    earth: 'Posts in a specific language or from a specific country, international topics, geography',
    usersround: 'Feeds based on social relationships: mutuals, followers, friends, a named community of people',
    sparkles: 'Personalised recommendation or discovery feeds (For You, Discover)',
    star: 'Popular, trending, hot or top posts',
    clock: 'Feeds defined by time: latest, chronological, catch-up, on this day',
    heart: 'Love, romance, kindness, wholesome or positive posts',
    sun: 'Weather, seasons, good-morning greetings',
    shirt: 'Fashion, clothing, cosmetics, beauty',
    shoppingbasket: 'Shopping, deals, products, commerce',
    ghost: 'Horror, spooky, the occult, Halloween',
    castle: 'History, archaeology, castles, fantasy worlds, tabletop role-playing',
    rainbow: 'LGBTQ+, pride',
    partypopper: 'Celebrations, events, festivals, birthdays',
    circlequestion: 'Questions and answers, asking for help',
    cannabis: 'Cannabis',
    none: 'General, mixed, personal or adult feeds, or no other option is clearly the main topic',
} as const;

const COLUMN_ICON_THRESHOLD = 0.7;

export const COLUMN_ICON_NAME_MAX = 100;
export const COLUMN_ICON_DESCRIPTION_MAX = 300;

export function pickColumnIcon(choice: string, probability: number | undefined): string | null {
    if (choice === 'none' || probability === undefined || probability < COLUMN_ICON_THRESHOLD) {
        return null;
    }
    return choice;
}

export async function judgeColumnIcon(name: string, description: string, apiKey: string): Promise<string | null> {
    const gateway = createGateway({ apiKey });
    const result = await evaluate({
        model: gateway.evaluationModel(aiFeature('columnIcon').model),
        state: { name, description },
        questions: {
            icon: { type: 'choice', instructions: COLUMN_ICON_INSTRUCTIONS, criteria: COLUMN_ICON_CRITERIA },
        },
        abortSignal: AbortSignal.timeout(8000),
        providerOptions: { gateway: { zeroDataRetention: true, disallowPromptTraining: true } },
    });

    const answer = result.answers.icon;
    return pickColumnIcon(answer.choice, answer.probabilities?.[answer.choice]);
}
