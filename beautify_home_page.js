// ==UserScript==
// @name         豆瓣主页优化
// @namespace    https://github.com/whyfishing/
// @version      1.0
// @description  豆瓣页面优化：移除侧边栏，一行显示5个内容，保留分页条
// @author       Half-century meteor shower
// @match        https://www.douban.com/
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加自定义样式
    GM_addStyle(`
        /* 移除侧边栏 */
        .aside, .aside-wrapper, #aside, .sidebar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            visibility: hidden !important;
        }

        /* 调整主内容区宽度 */
        #content, .main, .article {
            width: 100% !important;
            max-width: 1400px !important;
            margin: 0 auto !important;
            padding: 0 20px !important;
        }

        /* 网格容器 - 固定五列布局 */
        .content-grid-container {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 20px;
            padding: 20px 0;
        }

        /* 内容卡片样式 */
        .content-card {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            background: white;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
        }

        .content-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
        }

        /* 图片样式 */
        .content-card .pic {
            width: 100%;
            padding-top: 140%; /* 保持宽高比 2:3 */
            position: relative;
            margin: 0;
            cursor: pointer;
        }

        .content-card .pic img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.3s ease;
        }

        /* 标题样式 */
        .content-card .title {
            padding: 12px;
            font-size: 14px;
            line-height: 1.4;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .content-card .title a {
            color: #333;
            text-decoration: none;
        }

        .content-card .title a:hover {
            color: #072;
            text-decoration: underline;
        }

        /* 隐藏不需要的元素 */
        .status-item .hd, .status-item .actions, .status-item .others,
        .block-subject .content > p, .block-subject .info,
        .block-subject .rating_num, .block-subject .allstar45, .rank-label {
            display: none !important;
        }

        /* 移除边框和分割线 */
        .new-status.status-wrapper, .status-item, .mod, .block-subject {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
        }

        /* 确保内容块正确显示 */
        .status-item .bd, .block-subject .content {
            margin: 0 !important;
            padding: 0 !important;
        }

        /* 隐藏原始布局的容器但保留其内容 */
        .original-layout-container {
            display: none !important;
        }

        /* 分页条样式优化 */
        .paginator {
            clear: both !important;
            text-align: center !important;
            padding: 20px 0 !important;
            margin: 20px 0 !important;
            display: block !important;
        }

        .paginator a, .paginator span {
            margin: 0 4px !important;
            padding: 6px 12px !important;
        }
    `);

    // 函数：将缩略图URL转换为高清图URL
    function getHighResImageUrl(thumbUrl) {
        let highResUrl = thumbUrl;

        if (highResUrl.includes('/small/')) {
            highResUrl = highResUrl.replace('/small/', '/large/');
        } else if (highResUrl.includes('/thumb/')) {
            highResUrl = highResUrl.replace('/thumb/', '/photo/');
        } else if (highResUrl.includes('s_ratio_poster')) {
            highResUrl = highResUrl.replace('s_ratio_poster', 'l_ratio_poster');
        } else if (highResUrl.includes('webp')) {
            highResUrl = highResUrl.replace('.webp', '.jpg');
        }

        return highResUrl;
    }

    // 函数：替换图片为高清版本
    function replaceWithHighResImage(imgElement) {
        if (!imgElement || !imgElement.src) return;

        const highResUrl = getHighResImageUrl(imgElement.src);
        const highResImg = new Image();
        highResImg.src = highResUrl;

        highResImg.onload = function() {
            imgElement.style.opacity = '0';
            setTimeout(() => {
                imgElement.src = highResUrl;
                imgElement.style.opacity = '1';
            }, 300);
        };
    }

    // 处理内容项，转换为卡片
    function processItem(item) {
        // 尝试多种方式找到主体块
        let subjectBlock = item.querySelector('.block-subject') ||
                          item.querySelector('.subject') ||
                          item;

        if (!subjectBlock) return null;

        subjectBlock.classList.add('content-card');

        // 标记内容类型
        if (item.getAttribute('data-object-kind') === '1002' || item.querySelector('.movie')) {
            subjectBlock.setAttribute('data-content-type', 'movie');
        } else if (item.getAttribute('data-object-kind') === '1001' || item.querySelector('.book')) {
            subjectBlock.setAttribute('data-content-type', 'book');
        }

        subjectBlock.style.display = 'flex';
        subjectBlock.style.flexDirection = 'column';

        const imgElement = subjectBlock.querySelector('.pic img, img.cover');
        if (imgElement) {
            replaceWithHighResImage(imgElement);
        }

        return subjectBlock;
    }

    // 初始化布局
    function init() {
        // 强制移除侧边栏
        const removeElements = (selectors) => {
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => el?.remove());
            });
        };

        // 移除侧边栏
        removeElements(['.aside', '.aside-wrapper', '#aside', '.sidebar']);

        // 找到当前页面的内容项
        const statusWrappers = document.querySelectorAll('.new-status.status-wrapper');
        const movieItems = document.querySelectorAll('.status-item[data-object-kind="1002"]:not(.processed)');
        const bookItems = document.querySelectorAll('.status-item[data-object-kind="1001"]:not(.processed)');
        const subjectItems = document.querySelectorAll('.subject-item:not(.processed)');
        const allItems = [...movieItems, ...bookItems, ...subjectItems];

        if (allItems.length > 0) {
            // 创建网格容器（固定五列）
            const gridContainer = document.createElement('div');
            gridContainer.className = 'content-grid-container';

            // 处理并添加初始内容
            allItems.forEach(item => {
                item.classList.add('processed');
                const card = processItem(item);
                if (card) {
                    gridContainer.appendChild(card);
                }
            });

            // 添加到页面
            let insertionPoint = statusWrappers[0] || document.querySelector('#content') || document.body;
            if (insertionPoint.parentNode) {
                insertionPoint.parentNode.insertBefore(gridContainer, insertionPoint);
            } else {
                insertionPoint.appendChild(gridContainer);
            }

            // 隐藏原始布局
            statusWrappers.forEach(wrapper => {
                wrapper.classList.add('original-layout-container');
            });

            // 确保分页条显示在网格容器下方
            const paginators = document.querySelectorAll('.paginator');
            paginators.forEach(paginator => {
                paginator.style.display = 'block !important';
                gridContainer.parentNode.insertBefore(paginator, gridContainer.nextSibling);
            });
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
