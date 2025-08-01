// ==UserScript==
// @name         Bilibili Dark Theme
// @namespace    http://tampermonkey.net/
// @version      2025-07-30
// @description  Make Bilibili space dark
// @author       You
// @match        https://space.bilibili.com/436770440
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // Apply styles immediately without waiting for load event
    GM_addStyle(`
        /* Target more specific containers */
        body, html, #app {
            background-color: #000000 !important;
        }

        /* Add more elements that might be causing white background */
        .main-content, .page-container {
            background-color: #000000 !important;
            color: #ffffff !important; /* Ensure text is visible on black */
        }

        .v-popover-wrap {
            display: none !important;
        }
    `);

    // Watch for dynamic changes to re-apply styles
    const observer = new MutationObserver(() => {
        

        const btn = document.createElement('button');
        btn.textContent = '黑暗模式';
        btn.style.position = 'fixed';
        btn.style.top = '20px';
        btn.style.right = '20px';
        document.body.appendChild(btn);

        btn.addEventListener('click',()=>{
            GM_addStyle(`
                body, html, #app, .main-content, .nav-bar__main,.nav-bar__main, center-search__bar, .page-container {
                    background-color: #000000 !important;
                    color: #ffffff !important;
                }
            `);
        })

    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();