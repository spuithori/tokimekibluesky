<script lang="ts">

import MyProfileBadge from "./MyProfileBadge.svelte";
</script>

<footer class="footer">
  <div class="footer__wrap">
    <div class="footer__item footer__me">
      <MyProfileBadge></MyProfileBadge>
    </div>

    <div class="footer__item">
      <a href="/search">
        <svg xmlns="http://www.w3.org/2000/svg" width="20.332" height="20.332" viewBox="0 0 20.332 20.332">
          <path id="search" d="M68.02,66.291l-4.609-4.609a8.567,8.567,0,1,0-1.729,1.729l4.609,4.609a1.225,1.225,0,0,0,1.729-1.729ZM50.445,56.559a6.114,6.114,0,1,1,6.114,6.114,6.114,6.114,0,0,1-6.114-6.114Z" transform="translate(-48 -48)" fill="var(--text-color-1)"/>
        </svg>
      </a>
    </div>

    <div class="footer__item">
      <a href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="20.131" height="18.788" viewBox="0 0 20.131 18.788">
          <g id="home" transform="translate(-16 -32)">
            <path id="パス_47" data-name="パス 47" d="M72.19,99.154a.335.335,0,0,0-.464,0L64,106.53a.336.336,0,0,0-.1.243v6.922a1.342,1.342,0,0,0,1.342,1.342h4.03a.671.671,0,0,0,.671-.671v-5.7a.336.336,0,0,1,.336-.336h3.355a.336.336,0,0,1,.336.336v5.7a.671.671,0,0,0,.671.671h4.029a1.342,1.342,0,0,0,1.342-1.342v-6.922a.336.336,0,0,0-.1-.243Z" transform="translate(-45.892 -64.248)" fill="var(--text-color-1)"/>
            <path id="パス_48" data-name="パス 48" d="M35.917,40.9l-3.137-3V33.342a.671.671,0,0,0-.671-.671H30.1a.671.671,0,0,0-.671.671v1.342L27,32.362A1.306,1.306,0,0,0,26.065,32h0a1.3,1.3,0,0,0-.929.362L16.216,40.9a.684.684,0,0,0-.056.938.671.671,0,0,0,.972.044l8.7-8.316a.336.336,0,0,1,.464,0L35,41.879a.671.671,0,0,0,.947-.018A.688.688,0,0,0,35.917,40.9Z" transform="translate(0)" fill="var(--text-color-1)"/>
          </g>
        </svg>
      </a>
    </div>

    <div class="footer__item">
      <a href="/mention">
        <svg xmlns="http://www.w3.org/2000/svg" width="20.915" height="20.789" viewBox="0 0 20.915 20.789">
          <g id="at" transform="translate(-78.311 -77.27)">
            <path id="パス_49" data-name="パス 49" d="M183.333,178.54a4.331,4.331,0,0,1-4.3,4.27c-2.158,0-3.594-1.912-3.387-4.27a4.441,4.441,0,0,1,4.139-4.27A3.713,3.713,0,0,1,183.333,178.54Z" transform="translate(-91.171 -90.876)" fill="none" stroke="var(--text-color-1)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            <path id="パス_50" data-name="パス 50" d="M92.15,96.285a9.426,9.426,0,0,1-4.232.774,8.466,8.466,0,0,1-8.566-9.394A10.465,10.465,0,0,1,89.574,78.27c5.844,0,9.057,3.829,8.605,8.953-.337,3.825-2.781,4.928-4.061,4.7-1.2-.214-2.2-1.3-2.014-3.389l.453-5.137" transform="translate(0)" fill="none" stroke="var(--text-color-1)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </g>
        </svg>
      </a>
    </div>

    <div class="footer__item"></div>
  </div>
</footer>

<div class="footer-round"></div>

<style lang="postcss">
  .footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 10px 10px 0 0;
      box-shadow: 0 -1px 6px rgba(61, 120, 209, .09);
      background-color: var(--bg-color-1);
      z-index: 2;

      @media (min-width: 767px) {
          display: none;
      }

      &::before {
          content: '';
          display: block;
          position: absolute;
          right: 20px;
          top: 16px;
          bottom: 0;
          background-color: var(--base-bg-color);
          width: 52px;
      }

      &__wrap {
          display: flex;
          align-items: center;
          padding: 0 40px 0 20px;
          height: 60px;
          justify-content: space-between;
      }

      &__item {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
      }
  }

  .footer-round {
      position: fixed;
      width: 70px;
      height: 70px;
      background-color: var(--bg-color-1);
      border-radius: 50%;
      right: 11px;
      bottom: 11px;
      box-shadow: 0 3px 6px rgba(0, 0, 0, .16);
      z-index: 1;

      @media (min-width: 767px) {
          display: none;
      }
  }
</style>