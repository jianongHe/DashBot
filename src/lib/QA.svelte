<script>
    import Icon from '@iconify/svelte';

    let open = false;
    let tab = 'howtoplay';

    function close() {
        open = false;
    }

    function selectTab(value) {
        tab = value;
    }
</script>

<!-- Help Button -->
<div
        class="fixed bottom-4 right-4 font-bold rounded-full w-12 h-12 bg-black/70 border-2 border-purple-600 text-purple-400 hover:bg-purple-900/50 hover:text-purple-300 z-50 shadow-lg shadow-purple-900/20 flex items-center justify-center cursor-pointer"
        on:click={() => open = true}
>
    ?
    <div class="absolute top-0 left-0 w-full h-full rounded-full border border-purple-500/30"></div>
    <div class="absolute top-0 left-0 w-full h-full rounded-full animate-ping border border-purple-500/30 duration-1000"></div>
</div>

<!-- Dialog -->
{#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div class="max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden bg-gray-900/95 border-2 border-purple-800 text-white p-0 relative pointer-events-auto">

            <div class="absolute top-4 right-4">
                <div class="text-gray-400 hover:text-white hover:bg-gray-800/50 p-2 rounded cursor-pointer" on:click={close}>
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </div>
            </div>

            <div class="p-6 pb-2">
                <div class="flex items-center gap-2">
                    <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                        <line x1="8" y1="16" x2="8" y2="16" />
                        <line x1="16" y1="16" x2="16" y2="16" />
                    </svg>
                    <h2 class="text-2xl font-bold text-white">DASHBOT HELP</h2>
                </div>
                <p class="text-gray-400 mt-2">Game information, instructions, and development notes</p>
            </div>

            <!-- Tabs -->
            <div class="px-6">
                <div class="grid grid-cols-2 bg-black/30 p-0.5 mb-4">
                    <div class="flex items-center gap-1 justify-center py-2 px-3 text-sm font-medium cursor-pointer {tab === 'howtoplay' ? 'bg-purple-900 text-white' : ''}" on:click={() => selectTab('howtoplay')}>
                        HOW TO PLAY
                    </div>
                    <div class="flex items-center gap-1 justify-center py-2 px-3 text-sm font-medium cursor-pointer {tab === 'about' ? 'bg-purple-900 text-white' : ''}" on:click={() => selectTab('about')}>
                        ABOUT
                    </div>

                </div>
            </div>

            <!-- Tab Content -->
            <div class="overflow-y-auto min-h-[60vh] max-h-[60vh] px-6 pb-6 text-sm text-gray-300 space-y-4 custom-scrollbar">
                {#if tab === 'about'}
                    <div class="space-y-4">
                        <!-- Game Background -->
                        <div class="bg-black/30 p-4 rounded-md border border-purple-800/50 relative">
                            <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500"></div>
                            <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-purple-500"></div>
                            <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500"></div>
                            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500"></div>

                            <h3 class="text-xl font-bold text-purple-400 mb-2 flex items-center">
                                <span class="inline-block w-2 h-2 bg-purple-500 mr-2"></span>
                                Game Background
                            </h3>

                            <p class="mb-2">
                                <span class="text-green-400 font-bold">DASHBOT</span> is a 1v1 space robot battle game set in a derelict space station, where lonely maintenance bots roam.
                            </p>

                            <p>
                                With no functional legs, these robots rely on ejecting solid waste to dash forward. Use this unique movement to your advantage and outwit your opponent!
                            </p>
                        </div>

                        <!-- Core Gameplay -->
                        <div class="bg-black/30 p-4 rounded-md border border-green-500/50 relative">
                            <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500"></div>
                            <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500"></div>
                            <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500"></div>
                            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500"></div>

                            <h3 class="text-xl font-bold text-green-400 mb-2 flex items-center">
                                <span class="inline-block w-2 h-2 bg-green-500 mr-2"></span>
                                Core Gameplay
                            </h3>

                            <p class="mb-2">Control your robot with only one action:</p>
                            <ul class="list-disc pl-5 space-y-1">
                                <li>Hold to charge, release to dash in the direction of your rotating pointer.</li>
                                <li>Longer charge = further dash, faster speed, more damage (20~60 HP).</li>
                                <li>Charging cannot be canceled. Once started, you must dash!</li>
                            </ul>
                            <p class="mt-2">
                                Predict, time your dash, and outsmart your opponent in every move!
                            </p>
                        </div>

                        <!-- Battle Flow -->
                        <div class="bg-black/30 p-4 rounded-md border border-purple-800/50 relative">
                            <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500"></div>
                            <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-purple-500"></div>
                            <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500"></div>
                            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500"></div>

                            <h3 class="text-xl font-bold text-purple-400 mb-2 flex items-center">
                                <span class="inline-block w-2 h-2 bg-purple-500 mr-2"></span>
                                Battle Flow
                            </h3>

                            <ol class="list-decimal pl-5 space-y-1">
                                <li><strong>Opening:</strong> Both players test moves, feel the timing.</li>
                                <li><strong>Mid-game:</strong> The arena shrinks, dashes intensify.</li>
                                <li><strong>Final Clash:</strong> Fast spinning pointers, tight space, one mistake could cost the match.</li>
                            </ol>
                        </div>

                        <!-- Art Style -->
                        <div class="bg-black/30 p-4 rounded-md border border-green-500/50 relative">
                            <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500"></div>
                            <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500"></div>
                            <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500"></div>
                            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500"></div>

                            <h3 class="text-xl font-bold text-green-400 mb-2 flex items-center">
                                <span class="inline-block w-2 h-2 bg-green-500 mr-2"></span>
                                Art Style
                            </h3>

                            <ul class="list-disc pl-5 space-y-1">
                                <li>Pixel art meets space sci-fi aesthetics.</li>
                                <li>Robots: Round-headed astronauts, dashing with brown waste particles.</li>
                                <li>UI: Minimalist, intuitive, desktop & mobile-friendly.</li>
                            </ul>
                        </div>
                    </div>
                {:else if tab === 'howtoplay'}
                    <!-- Controls Section -->
                    <div class="bg-black/30 p-4 rounded-md border border-purple-800/50 relative space-y-4">
                        <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500"></div>
                        <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-purple-500"></div>
                        <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500"></div>
                        <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500"></div>

                        <h3 class="text-xl font-bold text-purple-400 mb-2 flex items-center">
                            <span class="inline-block w-2 h-2 bg-purple-500 mr-2"></span> Controls Overview
                        </h3>

                        <!-- Keyboard Controls -->
                        <div class="flex flex-col md:flex-row gap-6">
                            <div class="flex-1 bg-black/50 p-3 rounded-md border border-gray-800">
                                <h4 class="font-bold text-green-400 mb-2 text-center flex items-center justify-center">
                                    <Icon icon="material-symbols:keyboard-onscreen-outline-rounded" width="20" height="20" />
                                    <span class="ml-1">Keyboard</span>
                                </h4>
                                <div class="flex justify-around mb-4" style="height: 108px;">
                                    <!-- Player 1 -->
                                    <div class="text-center">
                                        <div class="text-purple-400 font-bold mb-1">Player 1</div>
                                        <div class="w-16 h-16 rounded-md border-2 border-purple-500 bg-gray-900 flex items-center justify-center shadow-md shadow-purple-900/50 mx-auto">
                                            <span class="text-2xl font-bold text-purple-400">A</span>
                                        </div>
                                    </div>
                                    <!-- Player 2 -->
                                    <div class="text-center">
                                        <div class="text-green-400 font-bold mb-1">Player 2</div>
                                        <div class="w-16 h-16 rounded-md border-2 border-green-500 bg-gray-900 flex items-center justify-center shadow-md shadow-green-900/50 mx-auto">
                                            <span class="text-2xl font-bold text-green-400">L</span>
                                        </div>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-300 text-center">Hold key to charge, release to dash.</p>
                            </div>

                            <!-- Mouse/Touch Controls -->
                            <div class="flex-1 bg-black/50 p-3 rounded-md border border-gray-800">
                                <h4 class="font-bold text-green-400 mb-2 text-center flex justify-center items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer h-4 w-4 mr-1"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>
                                    <span>Mouse / Touch</span>
                                </h4>
                                <div class="flex justify-around items-center mb-3">
                                    <!-- Player 1 -->
                                    <div class="text-center">
                                        <div class="text-purple-400 font-bold mb-1">Player 1</div>
                                        <div class="border border-purple-500 rounded-md p-2 mt-1 w-16 mx-auto">
                                            <!-- Simple mouse icon -->
                                            <svg viewBox="0 0 24 24" fill="none" class="w-full h-full stroke-purple-400" stroke-width="2">
                                                <rect x="6" y="3" width="12" height="18" rx="6" />
                                                <line x1="12" y1="7" x2="12" y2="11" />
                                            </svg>
                                        </div>
                                        <div class="text-xs text-gray-400 mt-2">Left Side</div>

                                    </div>
                                    <!-- Player 2 -->
                                    <div class="text-center">
                                        <div class="text-green-400 font-bold mb-1">Player 2</div>
                                        <div class="border border-green-500 rounded-md p-2 mt-1 w-16 mx-auto">
                                            <svg viewBox="0 0 24 24" fill="none" class="w-full h-full stroke-green-400" stroke-width="2">
                                                <rect x="6" y="3" width="12" height="18" rx="6" />
                                                <line x1="12" y1="7" x2="12" y2="11" />
                                            </svg>
                                        </div>
                                        <div class="text-xs text-gray-400 mt-2">Right Side</div>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-300">Tap and hold to charge, release to dash.</p>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    /* 自定义滚动条 */
    .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(75, 0, 130, 0.2); /* 紫色透明轨道 */
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(128, 90, 213, 0.7); /* 紫色滑块 */
        border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: rgba(168, 85, 247, 0.9); /* 滑块 hover 更亮 */
    }
</style>
