<template><image :src="src" :style="{ width: size + 'px', height: size + 'px', flexShrink: 0 }" mode="aspectFit" /></template>
<script setup>
import { computed } from 'vue';
const props = defineProps({ name: { type: String, default: 'arrow' }, size: { type: Number, default: 20 }, color: { type: String, default: 'currentColor' } });
const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6', back: 'm15 6-6 6 6 6',
  plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M6 18 18 6', check: 'm5 12 4 4L19 6',
  paper: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h8M8 17h5',
  user: 'M20 21a8 8 0 0 0-16 0m8-10a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  tasks: 'M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  spark: 'm12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8ZM20 2v4m-2-2h4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
  shield: 'M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7ZM8 12l3 3 5-6',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  link: 'm10 14 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  edit: 'm14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15ZM3 22h18',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  info: 'M12 10v7m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
};
const src = computed(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${props.color === 'currentColor' ? '#214b40' : props.color}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[props.name] || paths.info}"/></svg>`));
</script>
