<script lang="ts">
    import { columns, settings } from '$lib/stores';
    import ColumnModal from "$lib/components/column/ColumnModal.svelte";
    import DeckRow from "./DeckRow.svelte";
    let isColumnModalOpen = false;
    let unique = Symbol();

    function handleColumnModalClose() {
        isColumnModalOpen = false;
        unique = Symbol();
    }

    if (Array.isArray($columns) && !$columns.length) {
        columns.set([
            {
                id: 1,
                algorithm: {
                    type: 'default',
                    name: 'HOME'
                },
                style: 'default'
            },
        ]);
    }
</script>

{#if isColumnModalOpen}
  <ColumnModal on:close={handleColumnModalClose}></ColumnModal>
{/if}

<div class="decks-nav">
  <button class="decks-button" on:click={() => {isColumnModalOpen = true}} class:decks-button--left-sidebar={$settings.design?.publishPosition === 'left'}>DECKS
    <svg xmlns="http://www.w3.org/2000/svg" width="20.889" height="21.445" viewBox="0 0 20.889 21.445">
      <path id="settings-outline" d="M40.406,26h3.988a1.26,1.26,0,0,1,1.229,1.009q0,.023.008.046l.313,2.229a7.948,7.948,0,0,1,1.109.648l2.091-.843a1.249,1.249,0,0,1,1.532.524l2,3.458a1.245,1.245,0,0,1-.284,1.589l-1.8,1.411c.018.223.029.437.029.651s-.011.427-.029.639l1.78,1.4a1.251,1.251,0,0,1,.3,1.6L50.68,43.809a1.259,1.259,0,0,1-1.079.62,1.245,1.245,0,0,1-.444-.082L47.049,43.5a8.445,8.445,0,0,1-1.107.645l-.312,2.231a1.271,1.271,0,0,1-1.221,1.069h-4a1.26,1.26,0,0,1-1.229-1.009q0-.023-.008-.046l-.313-2.229a7.949,7.949,0,0,1-1.109-.648l-2.091.843a1.249,1.249,0,0,1-1.532-.524l-2-3.458a1.245,1.245,0,0,1,.284-1.589l1.8-1.411c-.021-.221-.033-.437-.033-.652s.011-.431.03-.643l-1.781-1.395a1.255,1.255,0,0,1-.295-1.6l1.993-3.449a1.259,1.259,0,0,1,1.079-.62,1.245,1.245,0,0,1,.444.082l2.107.848a8.445,8.445,0,0,1,1.107-.645l.312-2.231A1.271,1.271,0,0,1,40.39,26Zm6.646,5.424a1.485,1.485,0,0,1-.852-.267,6.519,6.519,0,0,0-.9-.527,1.49,1.49,0,0,1-.834-1.135l-.282-2H40.616l-.283,2.018a1.486,1.486,0,0,1-.824,1.133,6.947,6.947,0,0,0-.907.528,1.5,1.5,0,0,1-1.406.16L35.3,30.569l-1.781,3.082,1.6,1.257a1.487,1.487,0,0,1,.565,1.3c-.016.172-.024.341-.024.513s.009.346.024.519a1.486,1.486,0,0,1-.559,1.3l-1.609,1.263L35.3,42.889l1.889-.761a1.492,1.492,0,0,1,1.409.159,6.519,6.519,0,0,0,.9.527,1.49,1.49,0,0,1,.834,1.135l.282,2h3.569l.283-2.018a1.486,1.486,0,0,1,.824-1.133,6.947,6.947,0,0,0,.907-.528,1.5,1.5,0,0,1,1.406-.16l1.892.762,1.781-3.082-1.932-1.515a.746.746,0,0,1-.278-.692,6.473,6.473,0,0,0,.064-.869c0-.17-.009-.344-.023-.518a1.485,1.485,0,0,1,.564-1.3l1.607-1.261L49.5,30.556l-1.889.761A1.485,1.485,0,0,1,47.052,31.424ZM42.4,32.993h0q.183,0,.368.018A3.73,3.73,0,0,1,44,40.094a3.729,3.729,0,0,1-4.232-.734A3.73,3.73,0,0,1,42.4,32.993Zm0,5.967a2.219,2.219,0,0,0,.956-.215,2.238,2.238,0,0,0-.738-4.25c-.073-.007-.147-.011-.22-.011a2.238,2.238,0,0,0-1.581,3.82A2.224,2.224,0,0,0,42.4,38.96Z" transform="translate(-31.955 -26)" fill="var(--text-color-1)"/>
    </svg></button>
</div>

<div class="deck-wrap">
  <div class="deck" class:deck--left-sidebar={$settings.design?.publishPosition === 'left'}>
    {#key unique}
      {#each $columns as column, index (column.id)}
        <DeckRow {column} {index}></DeckRow>
      {/each}
    {/key}
  </div>
</div>

<style lang="postcss">
  .deck {
      position: fixed;
      /* top: 100px; */
      left: 0;
      bottom: 0;
      width: 100%;
      display: flex;
      gap: 20px;
      height: calc(100vh - 90px);
      overflow-x: scroll;
      padding-top: 10px;
      margin-top: -10px;

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
          top: 85px;
          padding-bottom: 45px;
      }

      &--left-sidebar {
          @media (min-width: 768px) {
              left: 360px;
              padding-left: 20px;
              width: calc(100vw - 360px);
              height: 100vh;
              z-index: 1000;
          }
      }
  }

  .decks-nav {
      position: absolute;
      left: 0;
      top: 0;
  }

  .decks-button {
      width: 230px;
      height: 40px;
      align-items: center;
      justify-content: center;
      text-align: center;
      border-radius: 20px;
      background-color: var(--bg-color-1);
      box-shadow: 0 2px 14px rgba(0, 0, 0, .08);
      color: var(--text-color-1);
      font-weight: 900;
      cursor: pointer;
      transition: box-shadow .2s ease-in-out;
      letter-spacing: .05em;
      text-overflow: ellipsis;
      overflow: hidden;
      padding: 0 35px;
      font-size: 15px;
      line-height: 1.25;
      position: fixed;
      left: 0;
      right: 0;
      margin: auto;
      z-index: 100;
      top: 15px;

      @media (max-width: 767px) {
          width: 190px;
          font-size: 13px;
          top: 20px;
      }

      &--left-sidebar {
          @media (min-width: 768px) {
              right: auto;
              top: 80px;
              left: 20px;
              z-index: 101;
              box-shadow: none;
              font-size: 14px;
              margin: auto;
              display: flex;
              flex-direction: row-reverse;
              align-items: center;
              justify-content: center;
              width: auto;
              height: 30px;
              padding: 0;
              gap: 10px;

              &:hover {
                  box-shadow: none !important;
              }

              svg {
                  position: static !important;
              }
          }
      }

      svg {
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          margin: auto;
      }

      &:hover {
          box-shadow: 0 2px 24px rgba(0, 0, 0, .16);
      }
  }
</style>