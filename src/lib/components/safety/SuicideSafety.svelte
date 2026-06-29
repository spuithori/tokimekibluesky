<script lang="ts">
    import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
</script>

<div class="safety safety--suicide">
  <div class="safety-heading">
    <div class="safety-heading__icon">
      <HeartHandshake size={32} color="var(--color-theme-1)" />
    </div>

    <h2 class="safety-heading__title">あなたの声を聴かせて</h2>
  </div>

  <section class="safety-section">
    <h3 class="safety-section__title"><a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/jisatsu/kokoro_dial.html" target="_blank" rel="noreferrer noopener nofollow">こころの健康相談統一ダイヤル</a></h3>
    <p class="safety-section__tel">
      <a href="tel:0570-064-556">0570-064-556</a>
    </p>
    <p class="safety-section__note">※相談に対応する曜日・時間は都道府県・政令指定都市によって異なります。</p>
  </section>

  <p class="safety-cite"><a href="https://www.mhlw.go.jp/mamorouyokokoro/" target="_blank" rel="noreferrer noopener nofollow">厚生労働省 - まもろうよ こころ</a></p>
</div>

<style lang="postcss">
  .safety {
      border: 2px solid var(--color-theme-1);
      padding: 24px 16px 8px;
      border-radius: var(--border-radius-3);
  }

  .safety-heading {
      text-align: center;
      margin-bottom: 16px;

      &__icon {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
      }

      &__title {
          font-size: 20px;
          letter-spacing: .05em;
      }
  }

  .safety-section {
      background-color: var(--bg-color-3);
      padding: 8px;
      text-align: center;

      &__title {
          font-size: 16px;

          a {
              color: inherit;
          }
      }

      &__tel {
          font-size: 20px;
          margin-bottom: 4px;

          a {
              color: inherit;
              text-decoration: underline;
          }
      }

      &__note {
          font-size: 12px;
      }
  }

  .safety-cite {
      font-size: 14px;
      text-align: right;
      margin-top: 8px;
  }
</style>