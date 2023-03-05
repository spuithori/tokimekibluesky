<script>
    import MyProfileBadge from "./MyProfileBadge.svelte";
</script>

<header class="header">
  <div class="header__wrap">
    <h1 class="header__title text-sm"><a href="/">Tokimeki Bluesky</a></h1>

    <div class="header__me">
      <MyProfileBadge></MyProfileBadge>
    </div>
  </div>
</header>

<style>
  .header {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      border-bottom: 1px solid #aaa;
      background-color: #fff;
      z-index: 100;
  }

  .header__wrap {
      padding: 0 20px;
      height: 70px;
      display: flex;
      align-items: center;
  }

  .header__title {
      font-size: 20px !important;
      font-weight: 400;
  }

  .header__me {
      margin-left: auto;
  }
</style>