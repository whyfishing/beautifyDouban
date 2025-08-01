// ==UserScript==
// @name         豆瓣影视五列布局优化
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  豆瓣'我看过的影视'页面优化：移除侧边栏，一行显示5个内容.
// @author       Qiu
// @match        *://movie.douban.com/people/*/collect*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 防止重复执行
    if (window.doubanLayoutOptimized) return;
    window.doubanLayoutOptimized = true;

    // 添加自定义样式 - 确保五列布局
    GM_addStyle(`
        /* 移除侧边栏 */
        .aside, .side-info, .mod, .tag-list {
            display: none !important;
        }

        /* 调整主内容区宽度 - 适应五列布局 */
        #content, .main, .article, .grid-16-8 {
            width: 100% !important;
            max-width: 1800px !important;
            margin: 0 auto !important;
            padding: 0 20px !important;
        }

        /* 网格容器 - 强制五列布局 */
        .content-grid-container {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 20px !important;
            padding: 20px 0 !important;
            margin: 0 !important;
        }

        /* 内容卡片样式 */
        .content-card {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            background: white;
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
        }

        /* 图片样式 */
        .content-card .pic {
            width: 100% !important;
            padding-top: 140% !important; /* 保持宽高比 2:3 */
            position: relative !important;
            margin: 0 !important;
        }

        .content-card .pic img {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
        }

        /* 标题样式 */
        .content-card .title {
            padding: 12px !important;
            font-size: 14px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            text-align: center !important;
        }

        /* 介绍内容样式 */
        .content-card .intro {
            padding: 0 12px 12px !important;
            font-size: 12px !important;
            color: #666 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }

        /* 评分和日期样式 */
        .content-card .rating-date {
            padding: 0 12px 12px !important;
            font-size: 12px !important;
            color: #666 !important;
            display: flex !important;
            justify-content: space-between !important;
        }

        /* 评论样式 */
        .content-card .comment {
            padding: 0 12px 12px !important;
            font-size: 12px !important;
            color: #333 !important;
            font-style: italic !important;
            border-top: 1px dashed #eee !important;
            margin: 0 12px !important;
        }

        /* 分页条样式 */
        .paginator {
            clear: both !important;
            text-align: center !important;
            padding: 20px 0 !important;
            margin: 20px 0 !important;
            display: block !important;
            grid-column: 1 / -1 !important;
        }
    `);

    // 转换图片为高清
    function getHighResImageUrl(thumbUrl) {
        if (!thumbUrl) return '';
        
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

    // 处理单张卡片
    function processItem(item) {
        if (!item || !item.classList.contains('comment-item')) return null;

        const card = document.createElement('div');
        card.className = 'content-card';

        // 处理图片
        const picContainer = item.querySelector('.pic');
        if (picContainer) {
            const clonedPic = picContainer.cloneNode(true);
            const img = clonedPic.querySelector('img');
            if (img) {
                img.src = getHighResImageUrl(img.src);
                img.srcset = getHighResImageUrl(img.srcset) || img.srcset;
            }
            card.appendChild(clonedPic);
        }

        // 处理标题
        const titleEl = item.querySelector('.title a');
        if (titleEl) {
            const titleContainer = document.createElement('div');
            titleContainer.className = 'title';
            const mainTitle = titleEl.querySelector('em')?.textContent || titleEl.textContent.trim();
            const link = document.createElement('a');
            link.href = titleEl.href;
            link.textContent = mainTitle;
            titleContainer.appendChild(link);
            card.appendChild(titleContainer);
        }

        // 处理介绍内容
        const introEl = item.querySelector('.intro');
        if (introEl) {
            const introContainer = document.createElement('div');
            introContainer.className = 'intro';
            introContainer.textContent = introEl.textContent;
            card.appendChild(introContainer);
        }

        // 处理评分和日期 - 替换:has()选择器以提高兼容性
        const ratingEls = item.querySelectorAll('.rating5-t, .rating4-t, .rating3-t, .rating2-t, .rating1-t');
        if (ratingEls.length > 0 && ratingEls[0].closest('li')) {
            const ratingDateEl = ratingEls[0].closest('li');
            const ratingDateContainer = document.createElement('div');
            ratingDateContainer.className = 'rating-date';
            ratingDateContainer.innerHTML = ratingDateEl.innerHTML;
            card.appendChild(ratingDateContainer);
        }

        // 处理评论
        const commentEl = item.querySelector('.comment');
        if (commentEl) {
            const commentContainer = document.createElement('div');
            commentContainer.className = 'comment';
            commentContainer.textContent = commentEl.textContent;
            card.appendChild(commentContainer);
        }

        return card;
    }

    // 初始化网格布局
    function initGridLayout() {
        const items = document.querySelectorAll('.item.comment-item');
        if (items.length === 0) return false;

        console.log(`找到${items.length}个影视条目，开始处理`);

        // 创建网格容器
        const gridContainer = document.createElement('div');
        gridContainer.className = 'content-grid-container';

        // 添加所有处理后的卡片
        items.forEach(item => {
            const card = processItem(item);
            if (card) {
                gridContainer.appendChild(card);
            }
        });

        // 插入到页面中 - 选择更可靠的插入位置
        const targetContainer = document.querySelector('.article') ||
                              document.querySelector('#content') ||
                              document.body;

        if (targetContainer) {
            // 尝试插入到操作栏后面
            const optBar = document.querySelector('.opt-bar');
            if (optBar && optBar.nextSibling) {
                targetContainer.insertBefore(gridContainer, optBar.nextSibling);
            } else {
                targetContainer.appendChild(gridContainer);
            }
            console.log('网格容器已插入页面');
        } else {
            console.error('未找到合适的容器插入网格');
            return false;
        }

        // 隐藏原始内容但保留分页
        const gridView = document.querySelector('.grid-view');
        if (gridView) {
            // 只隐藏内容，保留分页
            const items = gridView.querySelectorAll('.item');
            items.forEach(item => { 
                item.style.display = 'none'; 
            });
        }

        return true;
    }

    // 尝试直接初始化
    if (!initGridLayout()) {
        // 如果直接初始化失败，使用MutationObserver等待内容加载
        const observer = new MutationObserver((mutations, obs) => {
            if (initGridLayout()) {
                obs.disconnect(); // 完成后停止观察
                console.log('布局优化完成，停止观察');
            }
        });

        // 正确设置观察者
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('开始观察页面加载，准备优化布局');

        // 超时保护 - 5秒后停止观察
        setTimeout(() => {
            observer.disconnect();
            console.log('观察超时，停止观察');
        }, 5000);
    }
})();
