<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  const dispatch = createEventDispatcher();

  export let member;
  export let action;

  function add() {
      dispatch('add', {
          member: member
      });
  }

  function deleteMember() {
      dispatch('delete', {
          member: member
      });
  }
</script>

<div class="list-member">
  <div class="list-member__avatar">
    {#if (member.avatar)}
      <img src="{member.avatar}" alt="">
    {/if}
  </div>

  <div class="list-member__content">
    <p class="list-member__name">{member.displayName}</p>
    <p class="list-member__handle">{member.handle}</p>
  </div>

  <div class="list-member__buttons">
    {#if (action === 'add')}
      <button on:click={add} class="list-member-button list-member-button--add" aria-label="Add">
        <svg xmlns="http://www.w3.org/2000/svg" width="11.773" height="11.772" viewBox="0 0 11.773 11.772">
          <g id="グループ_98" data-name="グループ 98" transform="translate(-751.114 -442.114)">
            <path id="パス_24" data-name="パス 24" d="M.686-2.2H12.458V-4.746H.686Z" transform="translate(750.428 451.473)" fill="#fff"/>
            <path id="パス_25" data-name="パス 25" d="M.686-2.2H12.458V-4.746H.686Z" transform="translate(753.527 441.428) rotate(90)" fill="#fff"/>
          </g>
        </svg>
      </button>
    {:else}
      <button on:click={deleteMember} class="list-member-button list-member-button--delete" aria-label="Add">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <g id="グループ_90" data-name="グループ 90" transform="translate(-745 -436)">
            <circle id="bafkreidwy6swkoyicdm5nypbhyhk7z4o5fe7g5wiyo2255irpb3a6nwffy" cx="12" cy="12" r="12" transform="translate(745 436)" fill="#d81c2f"/>
            <path id="パス_24" data-name="パス 24" d="M.686-2.2H12.458V-4.746H.686Z" transform="translate(750.428 451.473)" fill="#fff"/>
          </g>
        </svg>
      </button>
    {/if}
  </div>
</div>

<style lang="postcss">
  .list-member {
      display: grid;
      grid-template-columns: 40px 1fr 24px;
      gap: 10px;
      margin-bottom: 10px;
      align-items: center;

      &__avatar {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--primary-color);

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
      }

      &__name {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: .025em;
      }

      &__handle {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-color-3);
      }
  }

  .list-member-button {
      width: 100%;
      height: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      background-color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
  }

</style>