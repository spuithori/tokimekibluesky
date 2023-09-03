<script lang="ts">
    import FeedsStoreIndex from "$lib/components/feeds/FeedsStoreIndex.svelte";
    import SearchForm from "../../../routes/(app)/SearchForm.svelte";
</script>

<div class="side-store">
  <div class="side-store-search">
    <SearchForm path="/search/feeds"></SearchForm>
  </div>

  <FeedsStoreIndex></FeedsStoreIndex>
</div>

<style lang="postcss">
  .side-store {
      padding: 16px;
  }

  .side-store-search {
      margin-bottom: 16px;
  }
</style>