import {
    Aperture,
    Bell,
    Bird,
    Bookmark, Bot, Box, Camera,
    Cat,
    Clapperboard,
    Clock3,
    Dog, FlaskConical, Heart,
    Home, Image,
    List, Newspaper,
    Pencil,
    Rainbow, Rss, Sparkles, Speaker,
    Star,
    Sun, Tent, TreePine, Apple, Beer, Coffee, IceCream, CakeSlice, Soup, UtensilsCrossed, Search, Repeat2, UserRound, Music
} from 'lucide-svelte';

export const iconMap = new Map();

iconMap.set('home', Home)
    .set('bell', Bell)
    .set('pencil', Pencil)
    .set('list', List)
    .set('bookmark', Bookmark)
    .set('search', Search)
    .set('user', UserRound)
    .set('rainbow', Rainbow)
    .set('sun', Sun)
    .set('clock', Clock3)
    .set('cat', Cat)
    .set('dog', Dog)
    .set('bird', Bird)
    .set('movie', Clapperboard)
    .set('star', Star)
    .set('speaker', Speaker)
    .set('newspaper', Newspaper)
    .set('sparkles', Sparkles)
    .set('bot', Bot)
    .set('box', Box)
    .set('camera', Camera)
    .set('image', Image)
    .set('science', FlaskConical)
    .set('aperture', Aperture)
    .set('heart', Heart)
    .set('repost', Repeat2)
    .set('tree', TreePine)
    .set('rss', Rss)
    .set('tent', Tent)
    .set('apple', Apple)
    .set('beer', Beer)
    .set('coffee', Coffee)
    .set('icecream', IceCream)
    .set('cake', CakeSlice)
    .set('soup', Soup)
    .set('dinner', UtensilsCrossed)
    .set('music', Music);