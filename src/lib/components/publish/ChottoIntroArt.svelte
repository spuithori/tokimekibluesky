<script lang="ts">
    import { _ } from 'tokimeki-i18n';

    const postLines = [
        { y: 68, width: 146, delay: 0 },
        { y: 80, width: 140, delay: 0.2 },
        { y: 92, width: 118, delay: 0.4 },
    ];

    const articleLines = [
        { y: 62, width: 136, delay: 2.7 },
        { y: 73, width: 128, delay: 2.85 },
        { y: 84, width: 112, delay: 3 },
        { y: 128, width: 136, delay: 3.3 },
        { y: 139, width: 96, delay: 3.45 },
    ];
</script>

<svg class="chotto-art" viewBox="0 0 428 168" aria-hidden="true">
    <rect class="chotto-art__ground" width="428" height="168" rx="16"></rect>

    <rect class="chotto-art__card" x="24" y="30" width="170" height="108" rx="12"></rect>
    <circle class="chotto-art__avatar" cx="44" cy="50" r="9"></circle>
    <rect class="chotto-art__name" x="60" y="45" width="54" height="7" rx="3.5"></rect>
    <rect class="chotto-art__line" x="118" y="45" width="36" height="7" rx="3.5"></rect>
    {#each postLines as line (line.y)}
        <rect class="chotto-art__line chotto-art__in" style="animation-delay: {line.delay}s" x="36" y={line.y} width={line.width} height="6" rx="3"></rect>
    {/each}
    <circle class="chotto-art__tap" cx="152" cy="116" r="16"></circle>
    <text class="chotto-art__more chotto-art__in" style="animation-delay: .6s" x="182" y="120" text-anchor="end">…{$_('chotto_read_more')}</text>
    <path class="chotto-art__wire" d="M186 116 C 214 116, 214 84, 242 84"></path>

    <g class="chotto-art__in" style="animation-delay: 2.4s">
        <rect class="chotto-art__card" x="244" y="14" width="160" height="140" rx="12"></rect>
        <svg x="256" y="26" width="52" height="8" viewBox="0 0 573.986 88.43">
            <g transform="translate(-186.514 -482.57)">
                <g transform="translate(-260 59)">
                    <path class="chotto-art__brand" d="M19.737,0V-35.346c0-10.449,4.386-18.834,13.8-18.834s13.674,4.515,13.674,13.674V0H58.437V-35.346c0-10.449,4.386-18.834,13.932-18.834,9.288,0,13.674,4.515,13.674,13.674V0H97.137V-43.215c0-13.158-6.321-20.511-18.576-20.511-11.352,0-17.8,8.385-20.253,18.318-.645-11.739-6.966-18.318-18.447-18.318-11.223,0-17.673,8.256-20.124,17.8V-62.436H8.514V0Z" transform="translate(438 510)"></path>
                    <path class="chotto-art__ink" d="M33.54,1.29c17.286,0,29.541-12.771,29.541-32.508S50.826-63.726,33.54-63.726,4.128-50.955,4.128-31.218,16.254,1.29,33.54,1.29Zm0-9.417c-10.578,0-17.931-7.353-17.931-23.091,0-15.867,7.353-23.091,17.931-23.091,10.707,0,18.189,7.224,18.189,23.091C51.729-15.48,44.247-8.127,33.54-8.127ZM108.231,1.29c16.254,0,25.8-9.417,28.767-21.93l-10.965-4.515C124.743-15.222,119.583-8,108.36-8c-11.352,0-18.189-8.514-18.189-23.22s6.837-23.091,18.189-23.091c11.223,0,16.383,7.1,17.673,17.028L137-41.8c-2.967-12.513-12.513-21.93-28.767-21.93-17.931,0-29.412,12.771-29.412,32.508C78.819-11.352,90.3,1.29,108.231,1.29ZM164.991,0V-35.346c0-10.449,4.386-18.834,16.383-18.834,10.578,0,13.8,5.676,13.8,13.8V0h11.094V-43.086c0-13.287-7.611-20.64-19.866-20.64S167.442-55.47,164.991-45.8V-86.43H153.768V0ZM251.55,1.29c17.286,0,29.541-12.771,29.541-32.508S268.836-63.726,251.55-63.726s-29.412,12.771-29.412,32.508S234.264,1.29,251.55,1.29Zm0-9.417c-10.578,0-17.931-7.353-17.931-23.091,0-15.867,7.353-23.091,17.931-23.091,10.707,0,18.189,7.224,18.189,23.091C269.739-15.48,262.257-8.127,251.55-8.127Zm67.338,9.546c8.643,0,14.577-4,17.286-8.256l-3.741-11.094c-1.677,3.87-5.547,8.514-11.094,8.514-4.9,0-8.643-1.935-8.643-9.933V-53.664h20.511v-8.772H312.7V-78.69l-11.223,8.256v8H291.411v8.772h10.062V-16C301.473-5.289,308.7,1.419,318.888,1.419Z" transform="translate(547 510)"></path>
                    <path class="chotto-art__ink" d="M29.412,1.419c8.643,0,14.577-4,17.286-8.256L42.957-17.931c-1.677,3.87-5.547,8.514-11.094,8.514-4.9,0-8.643-1.935-8.643-9.933V-53.664H43.731v-8.772H23.22V-78.69L12-70.434v8H1.935v8.772H12V-16C12-5.289,19.221,1.419,29.412,1.419Z" transform="translate(878 510)"></path>
                </g>
                <path class="chotto-art__brand" d="M2,11.019a7.014,7.014,0,0,1,4.292-6.55,6.472,6.472,0,0,1,7.364,1.861.659.659,0,0,0,.994,0,6.462,6.462,0,0,1,7.372-1.883,7,7,0,0,1,4.284,6.571c0,2.921-1.823,5.1-3.646,7.014l-6.674,6.776a2.356,2.356,0,0,1-3.646.024l-6.694-6.8C3.823,16.12,2,13.952,2,11.019" transform="translate(223.085 479.017)"></path>
            </g>
        </svg>
        <rect class="chotto-art__name" x="256" y="44" width="112" height="8" rx="4"></rect>
    </g>
    {#each articleLines as line (line.y)}
        <rect class="chotto-art__line chotto-art__in" style="animation-delay: {line.delay}s" x="256" y={line.y} width={line.width} height="5" rx="2.5"></rect>
    {/each}
    <rect class="chotto-art__image chotto-art__in" style="animation-delay: 3.15s" x="256" y="96" width="64" height="24" rx="4"></rect>
</svg>

<style lang="postcss">
    .chotto-art {
        display: block;
        width: 100%;
        height: auto;
    }

    .chotto-art__ground {
        fill: var(--bg-color-2);
    }

    .chotto-art__card {
        fill: var(--bg-color-1);
        stroke: var(--border-color-1);
    }

    .chotto-art__avatar {
        fill: var(--primary-color);
        opacity: .35;
    }

    .chotto-art__name {
        fill: var(--text-color-1);
        opacity: .8;
    }

    .chotto-art__line {
        fill: var(--text-color-1);
        opacity: .18;
    }

    .chotto-art__image {
        fill: var(--primary-color);
        opacity: .22;
    }

    .chotto-art__more {
        fill: var(--primary-color);
        font-size: 11px;
        font-weight: bold;
    }

    .chotto-art__brand {
        fill: #d44b6a;
    }

    .chotto-art__ink {
        fill: var(--text-color-1);
    }

    .chotto-art__in {
        transform-box: fill-box;
        animation: chotto-in 9s ease-out infinite backwards;
    }

    .chotto-art__line.chotto-art__in {
        animation-name: chotto-in-faint;
    }

    .chotto-art__image.chotto-art__in {
        animation-name: chotto-in-image;
    }

    .chotto-art__tap {
        fill: var(--primary-color);
        opacity: 0;
        transform-box: fill-box;
        transform-origin: center;
        animation: chotto-tap 9s ease-out infinite;
    }

    .chotto-art__wire {
        fill: none;
        stroke: var(--primary-color);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-dasharray: 96;
        stroke-dashoffset: 96;
        animation: chotto-wire 9s ease-in-out infinite;
    }

    @keyframes chotto-in {
        0% { opacity: 0; transform: translateY(3px); }
        4% { opacity: 1; transform: none; }
        62% { opacity: 1; }
        68%, 100% { opacity: 0; }
    }

    @keyframes chotto-in-faint {
        0% { opacity: 0; transform: translateY(3px); }
        4% { opacity: .18; transform: none; }
        62% { opacity: .18; }
        68%, 100% { opacity: 0; }
    }

    @keyframes chotto-in-image {
        0% { opacity: 0; transform: translateY(3px); }
        4% { opacity: .22; transform: none; }
        62% { opacity: .22; }
        68%, 100% { opacity: 0; }
    }

    @keyframes chotto-tap {
        0%, 15% { opacity: 0; transform: scale(.4); }
        18% { opacity: .35; }
        26%, 100% { opacity: 0; transform: scale(1.7); }
    }

    @keyframes chotto-wire {
        0%, 20% { stroke-dashoffset: 96; }
        28%, 84% { stroke-dashoffset: 0; }
        90%, 100% { stroke-dashoffset: -96; }
    }

    @media (prefers-reduced-motion: reduce) {
        .chotto-art__in,
        .chotto-art__wire,
        .chotto-art__tap {
            animation: none;
        }

        .chotto-art__wire {
            stroke-dashoffset: 0;
        }
    }
</style>
