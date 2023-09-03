import {
    Bell,
    Bird,
    Bookmark, Bot, Box, Camera,
    Cat,
    Clapperboard,
    Clock3,
    Dog, FlaskConical,
    Home, Image,
    List, Newspaper,
    Pencil,
    Rainbow, Sparkles, Speaker,
    Star,
    Sun
} from 'lucide-svelte';

export const iconMap = new Map();

iconMap.set('home', Home)
    .set('bell', Bell)
    .set('pencil', Pencil)
    .set('list', List)
    .set('bookmark', Bookmark)
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