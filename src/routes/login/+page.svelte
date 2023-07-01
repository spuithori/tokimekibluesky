<script lang="ts">
    import '../styles.css';
    import { _ } from 'svelte-i18n'
    import { AtpAgent, AtpSessionEvent, AtpSessionData } from '@atproto/api';
    import { goto } from '$app/navigation';
    import { accountsDb } from '$lib/db';

    let identifier = '';
    let password = '';
    let errorMessage = '';
    let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    let currentAccount = Number(localStorage.getItem('currentAccount') || '0' );
    let service = accounts[currentAccount]?.service || 'https://bsky.social';
    import { pwaInfo } from 'virtual:pwa-info';
    import { onMount } from 'svelte';

    if (currentAccount < 0) {
        currentAccount = 0;
    }

    async function login() {
        const agent = new AtpAgent({
            service: service,
        });

        try {
            await agent.login({identifier: identifier, password: password});

            const id = await accountsDb.accounts.put({
                id: undefined,
                session: agent.session as AtpSessionData,
                did: agent.session?.did || '',
                service: service,
            })

            /* if (accounts.length > currentAccount) {
                accounts[currentAccount].session = agent.session;
                accounts[currentAccount].service = service;
            } else {
                accounts.push({
                    name: agent.session.handle,
                    session: agent.session,
                    service: service,
                });
            } */
            // localStorage.setItem('service', $service);
            //localStorage.setItem('accounts', JSON.stringify(accounts));
            //localStorage.setItem('currentAccount', JSON.stringify(currentAccount));


            await goto('/');
        } catch (e) {
            errorMessage = e.message;
        }
    }

    onMount(async() => {
        if (pwaInfo) {
            const { registerSW } = await import('virtual:pwa-register')
            registerSW({
                immediate: true,
                onRegistered(r) {
                    r && setInterval(() => {
                        r.update()
                    }, 20000)

                    console.log(`SW Registered`)
                },
                onRegisterError(error) {
                    console.log('SW registration error', error)
                }
            })
        }
    })
</script>

<svelte:head>
  <title>Login - TOKIMEKI Bluesky</title>
</svelte:head>

<section class="login">
  <div class="login-wrap">
    <div class="login-logo">
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="202.47" height="229.86" viewBox="0 0 202.47 229.86">
        <defs>
          <linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#caecee"/>
            <stop offset="1" stop-color="#8c56d3"/>
          </linearGradient>
          <clipPath id="clip-path">
            <rect id="長方形_87" data-name="長方形 87" width="202.47" height="146.181" transform="translate(1655.528 380.327)" fill="url(#linear-gradient)"/>
          </clipPath>
          <linearGradient id="linear-gradient-2" x1="1" y1="0.4" x2="-0.112" y2="0.391" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#ffa3b2"/>
            <stop offset="0.268" stop-color="#ec86d6"/>
            <stop offset="0.536" stop-color="#73f08d"/>
            <stop offset="0.789" stop-color="#75c0e5"/>
            <stop offset="1" stop-color="#923ec9"/>
          </linearGradient>
          <linearGradient id="linear-gradient-3" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#afe2ff"/>
            <stop offset="1" stop-color="#fff"/>
          </linearGradient>
        </defs>
        <g id="グループ_110" data-name="グループ 110" transform="translate(-735.765 -45.91)">
          <path id="パス_38" data-name="パス 38" d="M-167.436-9.914a3,3,0,0,0-2.128-2.638,2.481,2.481,0,0,0,1.917-2.55c0-1.969-1.635-3.183-3.939-3.183h-1.459a12.4,12.4,0,0,0-3.183.545V-9c0,1.881,1.108,2.866,3.358,2.866h1.3C-169.37-6.133-167.436-7.487-167.436-9.914Zm-2.62-4.976c0,1.037-.879,1.459-1.952,1.459h-1.846v-2.725a7.544,7.544,0,0,1,1.037-.123h.9C-171.023-16.279-170.056-15.945-170.056-14.89Zm.193,5.046c0,.914-.633,1.512-1.934,1.512h-.985c-.6,0-1.055-.334-1.055-.756v-2.479h1.917C-170.513-11.567-169.863-11.145-169.863-9.843Zm9.143,2.321v-.51h-.633c-1.108,0-1.6-.3-1.6-1.248v-7.983a1.491,1.491,0,0,0-1.688-1.583h-.668v9.794A2.678,2.678,0,0,0-162.3-6.1C-161.264-6.1-160.719-6.5-160.719-7.522Zm9.565-2.919v-3.552c0-1.108-.58-1.688-1.952-1.688h-.422v5.328c0,1.618-.686,2.286-1.653,2.286-1.073,0-1.917-.7-1.917-2.444v-3.482c0-1.108-.6-1.688-1.952-1.688h-.44v5.4A4.01,4.01,0,0,0-155.3-5.975C-152.543-5.975-151.154-7.487-151.154-10.441Zm10.462-1.776a3.665,3.665,0,0,0-3.8-3.675c-2.708,0-4.642,1.987-4.642,5.152a4.677,4.677,0,0,0,4.66,4.765c2.6,0,3.429-.932,3.429-2.145v-.739h-.088a4.3,4.3,0,0,1-2.9.9,2.461,2.461,0,0,1-2.655-1.952h1.547C-142.01-9.914-140.692-10.476-140.692-12.217Zm-2.216-.281c0,.668-.51.914-2.743.914h-1.055l.018-.317a2.027,2.027,0,0,1,1.987-2.022C-143.611-13.923-142.907-13.448-142.907-12.5Zm11.025,3.323c0-1.512-1.055-2.374-3.024-2.69-1.618-.264-1.9-.457-1.9-.932,0-.615.457-1.055,1.9-1.055a4.141,4.141,0,0,1,2.708.879h.088v-.9c0-.914-.879-2.022-3.024-2.022-2.427,0-4.027,1.512-4.027,3.288,0,1.442.967,2.233,2.972,2.514,1.635.229,1.969.492,1.969,1.037,0,.7-.563,1.037-1.723,1.037a4.727,4.727,0,0,1-2.849-.9h-.088v1.073c0,.967,1.3,1.864,3.042,1.864C-133.289-5.975-131.882-7.171-131.882-9.175Zm2.849-9.671h-.756v10.99c0,1.09.51,1.67,1.565,1.67h.809v-4.642a40.432,40.432,0,0,0,3.306,4.044,2.311,2.311,0,0,0,1.547.651,1.449,1.449,0,0,0,1.6-1.161,3.985,3.985,0,0,1-1.829-1.231c-.844-.862-1.583-1.829-2.339-2.761a49.949,49.949,0,0,1,3.851-4.308v-.088h-1.354a2.431,2.431,0,0,0-1.881.615,25.36,25.36,0,0,0-2.9,3.446v-5.662A1.433,1.433,0,0,0-129.034-18.846Zm14.823,10.62c.44-1.02,2.092-5.345,2.092-6.348,0-.774-.352-1.108-1.108-1.108h-1.02A26.717,26.717,0,0,1-116.092-9.1a20.4,20.4,0,0,1-1.9-5.468,1.377,1.377,0,0,0-1.372-1.108h-1.248a30.035,30.035,0,0,0,3.358,8.827c-.51,1.336-.809,1.688-1.67,1.741l-1.336.088v.457a1.538,1.538,0,0,0,1.653,1.459C-116.9-3.109-115.969-4.076-114.211-8.226ZM-97.3-15.013v-.932c0-1.653-1.442-2.462-3.411-2.462a5.955,5.955,0,0,0-6.154,6.33,5.838,5.838,0,0,0,5.943,6c1.67,0,3.587-.7,3.587-2.356v-.9h-.088A4.743,4.743,0,0,1-100.6-8.173c-2.268,0-3.833-1.424-3.833-4.255a3.658,3.658,0,0,1,3.745-3.886,4.317,4.317,0,0,1,3.306,1.3Zm6.207,7.491v-.51h-.633c-1.108,0-1.6-.3-1.6-1.248v-7.983a1.491,1.491,0,0,0-1.688-1.583h-.668v9.794A2.678,2.678,0,0,0-92.671-6.1C-91.634-6.1-91.089-6.5-91.089-7.522Zm4.079-10.216A1.388,1.388,0,0,0-88.4-19.11a1.373,1.373,0,0,0-1.372,1.372A1.388,1.388,0,0,0-88.4-16.349,1.4,1.4,0,0,0-87.009-17.738Zm1.688,10.216v-.51h-.44c-1.037,0-1.442-.3-1.442-1.248v-4.431a1.543,1.543,0,0,0-1.688-1.758h-.668v6.418c0,1.917,1,2.954,2.831,2.954C-85.726-6.1-85.321-6.5-85.321-7.522Zm9.5-4.695a3.665,3.665,0,0,0-3.8-3.675c-2.708,0-4.642,1.987-4.642,5.152a4.677,4.677,0,0,0,4.66,4.765c2.6,0,3.429-.932,3.429-2.145v-.739h-.088a4.3,4.3,0,0,1-2.9.9,2.461,2.461,0,0,1-2.655-1.952h1.547C-77.145-9.914-75.826-10.476-75.826-12.217Zm-2.216-.281c0,.668-.51.914-2.743.914H-81.84l.018-.317a2.027,2.027,0,0,1,1.987-2.022C-78.745-13.923-78.042-13.448-78.042-12.5Zm12.555,6.312v-5.521a3.921,3.921,0,0,0-4.079-4.185,3.955,3.955,0,0,0-4.273,4.062v4.1a1.535,1.535,0,0,0,1.653,1.547h.7v-5.486c0-1.354.7-2.128,1.723-2.128,1.213,0,1.917.7,1.917,2.3v3.763A1.567,1.567,0,0,0-66.12-6.186Zm2.55-9.108v5.7c0,2.216,1.161,3.517,3.552,3.517,1.372,0,2.075-.615,2.075-1.583v-.844H-57.4a3.359,3.359,0,0,1-1.706.334c-.95,0-1.495-.475-1.495-1.706v-3.71h1.881a1.253,1.253,0,0,0,1.407-1.125v-.967H-60.6v-2.145h-.545a1.649,1.649,0,0,0-1.108.651A2.358,2.358,0,0,0-62.937-15.294Z" transform="translate(953.769 278.878)"/>
          <path id="パス_32" data-name="パス 32" d="M-181.034-27.846v-1.661h-17.773a3.017,3.017,0,0,0-3.207,2.9v1.739h7.612V-6.6c0,2.357,1.352,3.555,3.207,3.555h2.125v-21.83h4.868A3.357,3.357,0,0,0-181.034-27.846ZM-153.6-16.68c0-8.384-5.68-13.291-12.094-13.291-8.037,0-12.673,5.873-12.673,14.1,0,7.921,5.409,13.291,12.094,13.291C-158.2-2.577-153.6-8.643-153.6-16.68Zm-5.448.734c0,5.834-2.627,8.771-6.723,8.771-4.83,0-7.148-3.13-7.148-9.5,0-5.409,2.821-8.616,6.723-8.616C-161.715-25.3-159.049-22.166-159.049-15.946Zm12.441-13.562h-1.7V-6.634a3.264,3.264,0,0,0,3.477,3.593h1.739V-16.409a91.233,91.233,0,0,0,8.5,11.784,5.279,5.279,0,0,0,3.709,1.7c2.125,0,2.936-.773,3.4-2.666a4.932,4.932,0,0,1-2.086-1.082c-3.361-2.859-5.757-6.877-8.23-10.471a136.938,136.938,0,0,1,9.969-12.171v-.193h-3.632c-2.048,0-2.627.116-4.018,1.623a81.367,81.367,0,0,0-7.612,10.2v-8.268A3.249,3.249,0,0,0-146.608-29.507Zm28.321,26.467V-26.687a2.858,2.858,0,0,0-2.821-2.821h-2.4V-6.557A3.277,3.277,0,0,0-120.3-3.041Zm36.551,0c0-5.293-.773-16.807-1.275-20.98-.425-3.632-2.357-5.487-5.293-5.487h-.618c-1.082.889-2.782,3.555-4.134,7.766l-3.052,9.389a24.946,24.946,0,0,0-.734,2.7,34.952,34.952,0,0,0-1.507-5.023l-3.671-10.355c-1-2.821-3.593-4.482-7.264-4.482h-1.12a173.34,173.34,0,0,0-2.125,22.951,3.179,3.179,0,0,0,3.323,3.516h1.855c0-4.83.464-15.455,1.159-19.242.386.927,1,2.511,1.468,3.864l3.786,11.166c.966,2.859,2.511,4.212,4.25,4.212h1.43a19.371,19.371,0,0,0,2.164-4.714l3.709-11.359c.386-1.2.889-2.28,1.236-3.13.425,2.627,1,12.325,1,15.687,0,2.4,1.391,3.516,3.4,3.516ZM-57.7-7.986a26.579,26.579,0,0,1-5.8.58h-1.7c-4.1,0-5.6-.889-5.6-5.487v-1.546h6.993c2.125,0,3.207-.7,3.207-2.434v-1.893H-70.8a50.521,50.521,0,0,1,.386-6.182h9.08c2.434,0,3.555-.927,3.555-2.782v-1.777H-71.612c-2.164,0-3.632.811-4.057,3.98a55.675,55.675,0,0,0-.5,7.457v4.907c0,6.762,3.4,10.316,9.853,10.316H-63.5c4.637,0,5.718-1.159,5.757-3.284Zm6.221-21.521h-1.7V-6.634A3.264,3.264,0,0,0-49.7-3.041h1.739V-16.409a91.233,91.233,0,0,0,8.5,11.784,5.279,5.279,0,0,0,3.709,1.7c2.125,0,2.936-.773,3.4-2.666a4.932,4.932,0,0,1-2.086-1.082C-37.8-9.532-40.2-13.55-42.672-17.143A136.94,136.94,0,0,1-32.7-29.314v-.193h-3.632c-2.048,0-2.627.116-4.018,1.623a81.368,81.368,0,0,0-7.612,10.2v-8.268A3.249,3.249,0,0,0-51.482-29.507ZM-23.16-3.041V-26.687a2.858,2.858,0,0,0-2.821-2.821h-2.4V-6.557A3.277,3.277,0,0,0-25.17-3.041Z" transform="translate(949.587 249.039)" fill="#151515"/>
          <g id="マスクグループ_7" data-name="マスクグループ 7" transform="translate(-919.763 -334.417)" clip-path="url(#clip-path)">
            <g id="グループ_109" data-name="グループ 109" transform="translate(1655.528 380.327)">
              <circle id="楕円形_33" data-name="楕円形 33" cx="101.235" cy="101.235" r="101.235" transform="translate(0 0)" opacity="0.61" fill="url(#linear-gradient-2)"/>
              <path id="パス_37" data-name="パス 37" d="M80.8,0A80.8,80.8,0,1,1,0,80.8,80.8,80.8,0,0,1,80.8,0Z" transform="translate(20.561 28.857)" fill="url(#linear-gradient-3)"/>
              <circle id="楕円形_34" data-name="楕円形 34" cx="60.286" cy="60.286" r="60.286" transform="translate(40.949 57.893)" fill="url(#linear-gradient-3)"/>
              <circle id="楕円形_35" data-name="楕円形 35" cx="40.38" cy="40.38" r="40.38" transform="translate(61.423 86.84)" fill="#fff"/>
            </g>
          </g>
        </g>
      </svg>
    </div>

    {#if (errorMessage)}
      <p>{errorMessage}</p>
    {/if}

    <form action="#" on:submit|preventDefault={login}>
      <dl class="input-group">
        <dt class="input-group__name">
          <label for="service">Service</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="text" name="service" id="service" placeholder="service" bind:value="{service}" required />
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name">
          <label for="email">Email or handle</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="text" name="email" id="email" placeholder="Email or handle" bind:value="{identifier}" required />
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name">
          <label for="password">Password</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="password" name="password" id="password" placeholder="Password" bind:value="{password}" required />
        </dd>
      </dl>

      <div class="login-submit">
        <button class="button button--login button--login-submit" type="submit">{$_('login')}</button>
      </div>
    </form>
  </div>

  <div class="app-password-recommend">
    <p>{$_('recommend_use_app_password')}<br><a href="{$_('url_app_password')}" target="_blank" rel="noopener">{$_('details')}</a></p>
  </div>
</section>

<style>
  .login {
      min-height: 100vh;
      padding: 40px 0;
      background-image: url($lib/images/login-bg.jpg);
      background-size: cover;
      background-position: center;
      display: grid;
      place-content: center;
      font-family: 'Noto Sans JP', 'Noto Color Emoji', sans-serif;
  }

  .login-wrap {
      height: 600px;
      width: 100%;
      max-width: 400px;
      background-color: rgba(255, 255, 255, .85);
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 15px;
      backdrop-filter: blur(2px);
  }

  .login-logo {
      margin-bottom: 30px;
  }

  .login-submit {
      text-align: center;
      margin-top: 30px;
  }

  h1 {
      margin-bottom: 20px;
  }

  label {
      margin-bottom: 5px;
  }

  input {
      border-radius: 4px;
      height: 50px;
      padding: 0 20px;
  }

  .app-password-recommend {
      text-align: center;
      background-color: rgba(255, 255, 255, .85);
      color: var(--text-color-2);
      padding: 10px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 14px;
  }
</style>