<script>
    export let p1Ready;
    export let p2Ready;
    export let p1Score;
    export let p2Score;
    export let markP1Ready;
    export let markP2Ready;
    export let disableP1 = false;
    export let disableP2 = false;
    export let current = null;
    export let isOnline = false;
</script>

<div>
    <div class="score-pair">
        <div class="score">{p1Score}</div>
        <div class="symbol">:</div>
        <div class="score">{p2Score}</div>
    </div>

    <div class="ready-box">
        <div class="ready-section" class:disable={isOnline && current !== 1}>
            <div class="info">
                <div class="name">P1</div>
                {#if p1Ready}
                    <div class="ready-status">ready✅</div>
                {:else}
                    <div class="ready-status">{isOnline && current === 1 ? 'not ready' : 'waiting'}</div>
                {/if}
            </div>
            <button class="key" class:ready={p1Ready} onclick={markP1Ready}>A</button>
        </div>
        <div class="ready-section" class:disable={isOnline && current !== 2}>
            <div class="info">
                <div class="name">P2</div>
                {#if p2Ready}
                    <div class="ready-status">ready✅</div>
                {:else}
                    <div class="ready-status">{isOnline && current === 2 ? 'not ready' : 'waiting'}</div>
                {/if}
            </div>
            <button class="key" class:ready={p2Ready} onclick={markP2Ready}>L</button>
        </div>
    </div>
</div>

<style>
    .score-pair {
        padding: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 7rem;
        font-weight: bold;
    }

    .score-pair .score {

    }

    .ready-box {
        display: flex;
        width: 100%;
        justify-content: space-between;
        gap: 10px;
    }

    .ready-box .ready-section {
        display: flex;
        width: 100%;
    }

    .ready-box .ready-section.disable {
        display: flex;
        width: 100%;
        cursor: not-allowed;
    }
    .ready-box .ready-section.disable button {
        cursor: not-allowed;
    }

    .ready-box .ready-section:last-child {
        flex-direction: row-reverse;
    }

    .ready-box .ready-section:last-child .info {
        /*justify-content: center;*/
    }

    .ready-box .ready-section .info {
        display: flex;
        flex-direction: column;
        width: 50%;
        align-items: center;
        justify-content: space-around;
    }

    .ready-box .ready-section .info .ready-status {
        font-size: 1rem;
    }

    .ready-box .ready-section .info .name {

    }

    .ready-box .ready-section .key {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 3em;
        width: 50%;
        border: 1px solid #955bda;
        cursor: pointer;
    }

    .ready-box .ready-section .key.ready {
        border: 1px solid #955bda;
        background-color: rgba(103, 231, 161, 0.61);
    }

    .ready-box .ready-section .key:hover {
        background-color: rgba(192, 139, 227, 0.41);
    }

    .ready-box .ready-section.disable .key:hover {
        background-color: transparent;
    }

    .ready-box .ready-section .key.ready:hover {
        background-color: rgba(98, 238, 161, 0.78);
    }

    .ready-box .ready-section .info .check {
        display: flex;
    }
</style>