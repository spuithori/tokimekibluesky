<script lang="ts">
    import '../styles.css';
    import { AtpAgent, AtpSessionEvent, AtpSessionData } from '@atproto/api';
    import { goto } from '$app/navigation';

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
            if (accounts.length > currentAccount) {
                accounts[currentAccount].session = agent.session;
                accounts[currentAccount].service = service;
            } else {
                accounts.push({
                    name: agent.session.handle,
                    session: agent.session,
                    service: service,
                });
            }
            // localStorage.setItem('service', $service);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            localStorage.setItem('currentAccount', JSON.stringify(currentAccount));
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
      <svg xmlns="http://www.w3.org/2000/svg" width="187.22" height="74.85" viewBox="0 0 187.22 74.85">
        <g id="グループ_2" data-name="グループ 2" transform="translate(-1041.45 -603)">
          <path id="パス_2" data-name="パス 2" d="M-175.6-14.124v-.946h-10.12a1.718,1.718,0,0,0-1.826,1.65v.99h4.334V-2.024A1.781,1.781,0,0,0-181.39,0h1.21V-12.43h2.772A1.912,1.912,0,0,0-175.6-14.124Zm15.18,6.358c0-4.774-3.234-7.568-6.886-7.568-4.576,0-7.216,3.344-7.216,8.03,0,4.51,3.08,7.568,6.886,7.568C-163.042.264-160.424-3.19-160.424-7.766Zm-3.1.418c0,3.322-1.5,4.994-3.828,4.994-2.75,0-4.07-1.782-4.07-5.412,0-3.08,1.606-4.906,3.828-4.906C-165.044-12.672-163.526-10.89-163.526-7.348Zm6.644-7.722h-.968V-2.046A1.859,1.859,0,0,0-155.87,0h.99V-7.612A51.947,51.947,0,0,0-150.04-.9a3.006,3.006,0,0,0,2.112.968,1.677,1.677,0,0,0,1.936-1.518,2.808,2.808,0,0,1-1.188-.616c-1.914-1.628-3.278-3.916-4.686-5.962a77.974,77.974,0,0,1,5.676-6.93v-.11h-2.068a2.345,2.345,0,0,0-2.288.924,46.332,46.332,0,0,0-4.334,5.808v-4.708A1.85,1.85,0,0,0-156.882-15.07ZM-141.2,0V-13.464A1.627,1.627,0,0,0-142.8-15.07h-1.364V-2a1.866,1.866,0,0,0,1.826,2Zm20.372,0c0-3.014-.44-9.57-.726-11.946-.242-2.068-1.342-3.124-3.014-3.124h-.352a10.513,10.513,0,0,0-2.354,4.422L-129.008-5.3a14.21,14.21,0,0,0-.418,1.54,19.9,19.9,0,0,0-.858-2.86l-2.09-5.9a4.03,4.03,0,0,0-4.136-2.552h-.638A98.7,98.7,0,0,0-138.358-2a1.81,1.81,0,0,0,1.892,2h1.056a93.108,93.108,0,0,1,.66-10.956c.22.528.572,1.43.836,2.2l2.156,6.358c.55,1.628,1.43,2.4,2.42,2.4h.814a11.029,11.029,0,0,0,1.232-2.684l2.112-6.468c.22-.682.506-1.3.7-1.782.242,1.5.572,7.018.572,8.932a1.79,1.79,0,0,0,1.936,2Zm13.244-2.816a15.134,15.134,0,0,1-3.3.33h-.968c-2.332,0-3.19-.506-3.19-3.124v-.88h3.982c1.21,0,1.826-.4,1.826-1.386V-8.954h-5.808a28.767,28.767,0,0,1,.22-3.52h5.17c1.386,0,2.024-.528,2.024-1.584V-15.07H-115.5c-1.232,0-2.068.462-2.31,2.266a31.7,31.7,0,0,0-.286,4.246v2.794c0,3.85,1.936,5.874,5.61,5.874h1.606c2.64,0,3.256-.66,3.278-1.87Zm3.1-12.254h-.968V-2.046A1.859,1.859,0,0,0-103.466,0h.99V-7.612A51.948,51.948,0,0,0-97.636-.9a3.006,3.006,0,0,0,2.112.968,1.677,1.677,0,0,0,1.936-1.518,2.808,2.808,0,0,1-1.188-.616C-96.69-3.7-98.054-5.984-99.462-8.03a77.972,77.972,0,0,1,5.676-6.93v-.11h-2.068a2.345,2.345,0,0,0-2.288.924,46.33,46.33,0,0,0-4.334,5.808v-4.708A1.85,1.85,0,0,0-104.478-15.07ZM-88.792,0V-13.464A1.627,1.627,0,0,0-90.4-15.07h-1.364V-2a1.866,1.866,0,0,0,1.826,2Zm19.25-4.664a3.75,3.75,0,0,0-2.662-3.3,3.1,3.1,0,0,0,2.4-3.19c0-2.464-2.046-3.982-4.928-3.982H-76.56a15.518,15.518,0,0,0-3.982.682V-3.52c0,2.354,1.386,3.586,4.2,3.586h1.628C-71.962.066-69.542-1.628-69.542-4.664ZM-72.82-10.89c0,1.3-1.1,1.826-2.442,1.826h-2.31v-3.41a9.439,9.439,0,0,1,1.3-.154h1.122C-74.03-12.628-72.82-12.21-72.82-10.89Zm.242,6.314c0,1.144-.792,1.892-2.42,1.892H-76.23c-.748,0-1.32-.418-1.32-.946v-3.1h2.4C-73.392-6.732-72.578-6.2-72.578-4.576Zm11.44,2.9V-2.31h-.792c-1.386,0-2-.374-2-1.562V-13.86a1.866,1.866,0,0,0-2.112-1.98h-.836V-3.586c0,2.4,1.32,3.7,3.762,3.7C-61.82.11-61.138-.4-61.138-1.672ZM-49.17-5.324V-9.768c0-1.386-.726-2.112-2.442-2.112h-.528v6.666c0,2.024-.858,2.86-2.068,2.86-1.342,0-2.4-.88-2.4-3.058V-9.768c0-1.386-.748-2.112-2.442-2.112h-.55v6.754A5.017,5.017,0,0,0-54.362.264C-50.908.264-49.17-1.628-49.17-5.324Zm13.09-2.222a4.586,4.586,0,0,0-4.752-4.6c-3.388,0-5.808,2.486-5.808,6.446A5.852,5.852,0,0,0-40.81.264c3.256,0,4.29-1.166,4.29-2.684v-.924h-.11a5.374,5.374,0,0,1-3.63,1.122,3.08,3.08,0,0,1-3.322-2.442h1.936C-37.73-4.664-36.08-5.368-36.08-7.546ZM-38.852-7.9c0,.836-.638,1.144-3.432,1.144H-43.6l.022-.4A2.536,2.536,0,0,1-41.1-9.68C-39.732-9.68-38.852-9.086-38.852-7.9ZM-25.058-3.74c0-1.892-1.32-2.97-3.784-3.366-2.024-.33-2.376-.572-2.376-1.166,0-.77.572-1.32,2.376-1.32a5.181,5.181,0,0,1,3.388,1.1h.11V-9.614c0-1.144-1.1-2.53-3.784-2.53-3.036,0-5.038,1.892-5.038,4.114,0,1.8,1.21,2.794,3.718,3.146,2.046.286,2.464.616,2.464,1.3,0,.88-.7,1.3-2.156,1.3A5.914,5.914,0,0,1-33.7-3.41h-.11v1.342c0,1.21,1.628,2.332,3.806,2.332C-26.818.264-25.058-1.232-25.058-3.74Zm3.564-12.1h-.946V-2.09C-22.44-.726-21.8,0-20.482,0h1.012V-5.808a50.588,50.588,0,0,0,4.136,5.06A2.892,2.892,0,0,0-13.4.066a1.814,1.814,0,0,0,2-1.452,4.986,4.986,0,0,1-2.288-1.54C-14.74-4-15.664-5.214-16.61-6.38a62.493,62.493,0,0,1,4.818-5.39v-.11h-1.694a3.042,3.042,0,0,0-2.354.77A31.729,31.729,0,0,0-19.47-6.8v-7.084A1.792,1.792,0,0,0-21.494-15.84ZM-2.948-2.552C-2.4-3.828-.33-9.24-.33-10.494c0-.968-.44-1.386-1.386-1.386H-2.992A33.427,33.427,0,0,1-5.3-3.652a25.529,25.529,0,0,1-2.376-6.842A1.722,1.722,0,0,0-9.394-11.88h-1.562A37.579,37.579,0,0,0-6.754-.836C-7.392.836-7.766,1.276-8.844,1.342l-1.672.11v.572A1.924,1.924,0,0,0-8.448,3.85C-6.314,3.85-5.148,2.64-2.948-2.552Z" transform="translate(1229 674)"/>
          <path id="heart" d="M23.048,6.011,21.633,4.619A12.757,12.757,0,0,0,3.592,22.645l0-.007L23.048,42.1l19.46-19.483A12.758,12.758,0,0,0,24.456,4.6l.007,0L23.048,6.008Z" transform="translate(1111.952 601.895)" fill="var(--primary-color)"/>
        </g>
      </svg>
    </div>

    {#if (errorMessage)}
      <p>{errorMessage}</p>
    {/if}

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
        <input class="input-group__input" type="email" name="email" id="email" placeholder="Email or handle" bind:value="{identifier}" required />
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
      <button class="button button--login button--login-submit" type="submit" on:click={login}>Login</button>
    </div>
  </div>
</section>

<style>
  .login {
      height: 100vh;
      background-image: url($lib/images/login-bg.jpg);
      background-size: cover;
      background-position: center;
      display: grid;
      place-content: center;
  }

  .login-wrap {
      height: 500px;
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
</style>