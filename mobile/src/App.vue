<script>
import { hasActiveAccount } from './core/account.js';

export default {
  onLaunch() {
    // #ifdef APP-PLUS
    if (!hasActiveAccount()) uni.reLaunch({ url: '/pages/login/index' });
    // #endif
  },
};
</script>

<style lang="scss">
@import './styles/global.scss';
</style>
