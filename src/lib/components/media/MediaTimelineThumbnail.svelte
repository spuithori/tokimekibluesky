<script lang="ts">
  let { images } = $props();
</script>

<div class="media-thumbnail">
  <img class="media-thumbnail__image" loading="lazy" src="{images[0].thumb}" alt="">

  {#if (images.length > 1)}
    <div class="media-thumbnail__count">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><g fill="#fff" data-name="グループ 88" transform="translate(-77 -224)"><rect width="11" height="11" data-name="長方形 73" rx="1" transform="translate(80 224)"/><rect width="2" height="11" data-name="長方形 74" rx="1" transform="translate(77 227)"/><rect width="2" height="11" data-name="長方形 75" rx="1" transform="rotate(-90 157.5 80.5)"/></g></svg>
      {images.length}</div>
  {/if}
</div>

<style lang="postcss">
  .media-thumbnail {
      width: 100%;
      height: 100%;

      &__image {
          width: 100%;
          height: 100%;
          object-fit: cover;

          &:hover {
              @media (max-width: 767px) {
                  transform: none;
              }

              @media (pointer: coarse) {
                  transform: none;
              }
          }
      }

      &__count {
          color: #fff;
          background-color: rgba(0, 0, 0, .5);
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 13px;
          width: 40px;
          height: 24px;
          border-radius: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          pointer-events: none;

          svg {
              transform: scale(.8);
          }
      }
  }
</style>