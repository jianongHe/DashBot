<script>
    export let chargeLevel = 0; // 0~1
    export let totalSegments = 30;
    export let color = 'purple';
    export let reverse = false;

    const colorGradientMap = {
        purple: ['bg-purple-400', 'bg-purple-500', 'bg-purple-600', 'bg-purple-700'],
        green: ['bg-green-400', 'bg-green-500', 'bg-green-600', 'bg-green-700'],
    };

    // 暗淡未充能部分自定义透明度
    const unfilledColorStyle = {
        purple: 'background-color: rgba(128, 90, 213, 0.25);',
        green: 'background-color: rgba(72, 187, 120, 0.25);',
    };

    $: filledSegments = Math.round(chargeLevel * totalSegments);
    $: skewClass = reverse ? 'skew-x-12' : '-skew-x-12';
    const highlightRatio = 0.35;

    // 电波相关
    let waveIndices = [];
    const waveSpeed = 80;
    const maxWaves = 5;
    const waveLength = 2;
    $: waveCount = Math.ceil(chargeLevel * maxWaves);

    // 初始化电波位置
    for (let i = 0; i < maxWaves; i++) {
        waveIndices.push(Math.floor(Math.random() * totalSegments));
    }

    const startWaves = () => {
        setInterval(() => {
            waveIndices = waveIndices.map((idx, i) =>
                (idx + 1 + i) % totalSegments
            );
        }, waveSpeed);
    };

    startWaves();

    // 渐变颜色选择
    const getGradientColor = (i) => {
        const ratio = i / totalSegments;
        const index = ratio < 0.33 ? 0 : ratio < 0.66 ? 1 : ratio < 0.85 ? 2 : 3;
        return colorGradientMap[color][index];
    };
</script>

<style>
    .glow {
        box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
    }
</style>

<div class={`flex gap-[0.5px] items-end ${reverse ? 'flex-row-reverse' : ''}`}>
    {#each Array(totalSegments) as _, i}
        {#if reverse}
            <div
                    class={`w-[5px] ${i / totalSegments < highlightRatio ? 'h-[16px]' : 'h-[10px]'} rounded transform ${skewClass} ${
          i < filledSegments
            ? `${getGradientColor(i)} ${
                waveIndices.slice(0, waveCount).some(w => i >= w && i < w + waveLength) ? 'glow' : ''
              }`
            : ''
        }`}
                    style={i >= filledSegments ? unfilledColorStyle[color] : ''}
            ></div>
        {:else}
            <div
                    class={`w-[5px] ${i / totalSegments < highlightRatio ? 'h-[16px]' : 'h-[10px]'} rounded transform ${skewClass} ${
          i < filledSegments
            ? `${getGradientColor(i)} ${
                waveIndices.slice(0, waveCount).some(w => i >= w && i < w + waveLength) ? 'glow' : ''
              }`
            : ''
        }`}
                    style={i >= filledSegments ? unfilledColorStyle[color] : ''}
            ></div>
        {/if}
    {/each}
</div>