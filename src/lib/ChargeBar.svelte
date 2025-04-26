<script>
    export let chargeLevel = 0; // 当前充能格数
    export let totalSegments = 10; // 总格数
    export let color = 'purple'; // 'purple' or 'green'

    const colorMap = {
        purple: 'bg-purple-500',
        green: 'bg-green-500',
    };
</script>

<div class="flex gap-[1px]">
    {#each Array(totalSegments) as _, i}
        <div
                class={`w-[6px] h-[12px] transform -skew-x-12 ${
        i < chargeLevel ? colorMap[color] : 'bg-gray-300'
      }`}
        ></div>
    {/each}
</div>
