// ==UserScript==
// @name         豆瓣内容五列布局（完善版无限滚动）
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  豆瓣页面优化：移除侧边栏和分页条，一行显示5个内容，完善无限滚动（加载完毕后停止尝试）
// @author       豆包编程助手
// @match        *://www.douban.com/*
// @match        *://movie.douban.com/*
// @match        *://book.douban.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
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
        
        /* 移除分页条 */
        .paginator {
            display: none !important;
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

        /* 加载状态样式 */
        .content-card .pic .loading {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            color: #666;
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
        .status-item .bd {
            margin: 0 !important;
            padding: 0 !important;
        }

        .block-subject .content {
            padding: 0 !important;
        }

        /* 隐藏原始布局的容器但保留其内容 */
        .original-layout-container {
            display: none !important;
        }
        
        /* 加载更多指示器 */
        .infinite-loader {
            grid-column: 1 / -1;
            text-align: center;
            padding: 20px;
            color: #666;
        }
        
        .infinite-loader .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #072;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 8px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* 所有内容加载完毕提示 */
        .all-loaded {
            grid-column: 1 / -1;
            text-align: center;
            padding: 20px;
            color: #666;
            font-style: italic;
        }
    `);

    // 无限滚动相关变量
    let isLoading = false;
    let currentPage = 1;
    const loadThreshold = 500; // 距离底部多少像素时加载更多
    let maxRetries = 3; // 最大重试次数
    let retryCount = 0; // 当前重试次数
    let totalItemsLoaded = 0; // 已加载的总项目数
    let lastLoadedItemsCount = 0; // 上一次加载的项目数
    let allContentLoaded = false; // 标记是否所有内容都已加载完毕

    // 函数：获取下一页URL
    function getNextPageUrl() {
        // 如果所有内容已加载，不再获取URL
        if (allContentLoaded) return null;
        
        // 先尝试从当前页面找到任何分页链接
        const pageLinks = document.querySelectorAll('.paginator a[href*="?p="]');
        if (pageLinks.length > 0) {
            let nextPageUrl = null;
            
            pageLinks.forEach(link => {
                const pageMatch = link.href.match(/p=(\d+)/);
                if (pageMatch && pageMatch[1]) {
                    const pageNum = parseInt(pageMatch[1]);
                    // 找到当前页的下一页
                    if (pageNum === currentPage + 1) {
                        nextPageUrl = link.href;
                    }
                }
            });
            
            if (nextPageUrl) {
                return nextPageUrl;
            }
        }
        
        // 手动构造下一页URL
        currentPage++;
        const currentUrl = window.location.href;
        const urlObj = new URL(currentUrl);
        urlObj.searchParams.set('p', currentPage);
        return urlObj.toString();
    }

    // 函数：提取页面中的内容项
    function extractItemsFromHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 尝试多种选择器
        const selectors = [
            '.status-item[data-object-kind="1002"]', // 电影
            '.status-item[data-object-kind="1001"]', // 书籍
            '.subject-item', // 通用内容项
            '.item' // 后备选择器
        ];
        
        let items = [];
        selectors.some(selector => {
            items = Array.from(doc.querySelectorAll(selector));
            return items.length > 0;
        });
        
        return items;
    }

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

        const picContainer = imgElement.closest('.pic');
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.textContent = '加载高清图...';
        picContainer.appendChild(loadingIndicator);

        const highResUrl = getHighResImageUrl(imgElement.src);
        const highResImg = new Image();
        highResImg.src = highResUrl;

        highResImg.onload = function() {
            imgElement.style.opacity = '0';
            setTimeout(() => {
                imgElement.src = highResUrl;
                imgElement.style.opacity = '1';
                loadingIndicator.remove();
            }, 300);
        };

        highResImg.onerror = function() {
            loadingIndicator.textContent = '高清图加载失败';
            setTimeout(() => loadingIndicator.remove(), 1500);
        };
    }

    // 处理内容项，转换为卡片
    function processItem(item) {
        // 尝试多种方式找到主体块
        let subjectBlock = item.querySelector('.block-subject');
        if (!subjectBlock) {
            subjectBlock = item.querySelector('.subject');
        }
        if (!subjectBlock) {
            subjectBlock = item;
        }

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

    // 从新页面加载内容
    function fetchNextPageContent(gridContainer) {
        // 如果所有内容已加载或正在加载，直接返回
        if (allContentLoaded || isLoading) return;
        isLoading = true;

        // 显示加载指示器
        let loader = document.querySelector('.infinite-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'infinite-loader';
            gridContainer.appendChild(loader);
        }
        loader.innerHTML = `<div class="spinner"></div> 加载第${currentPage}页内容...`;

        // 获取下一页URL
        const nextPageUrl = getNextPageUrl();
        
        if (!nextPageUrl) {
            markAllContentLoaded(gridContainer);
            return;
        }

        // 使用GM_xmlhttpRequest获取内容
        GM_xmlhttpRequest({
            method: 'GET',
            url: nextPageUrl,
            onload: function(response) {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                
                // 提取新内容项
                const newItems = extractItemsFromHtml(response.responseText);

                // 检查是否真的加载到新内容
                if (newItems.length > 0) {
                    // 重置重试计数器
                    retryCount = 0;
                    lastLoadedItemsCount = newItems.length;
                    totalItemsLoaded += newItems.length;
                    
                    // 移除加载指示器
                    if (loader) loader.remove();
                    
                    // 处理并添加新内容
                    newItems.forEach(item => {
                        const clonedItem = document.importNode(item, true);
                        clonedItem.classList.add('processed', 'from-next-page');
                        
                        const card = processItem(clonedItem);
                        if (card) {
                            gridContainer.appendChild(card);
                        }
                    });
                    
                    isLoading = false;
                } else {
                    // 没有加载到内容，判断为所有内容已加载完毕
                    markAllContentLoaded(gridContainer);
                }
            },
            onerror: function(error) {
                console.error('加载下一页失败:', error);
                
                if (retryCount < maxRetries) {
                    retryCount++;
                    loader.innerHTML = `<div class="spinner"></div> 加载失败，重试中 (${retryCount}/${maxRetries})...`;
                    
                    // 短暂延迟后重试
                    setTimeout(() => {
                        isLoading = false;
                        fetchNextPageContent(gridContainer);
                    }, 2000);
                } else {
                    // 多次重试失败，提示用户手动重试
                    loader.innerHTML = '加载失败，点击重试';
                    loader.style.cursor = 'pointer';
                    loader.addEventListener('click', () => {
                        retryCount = 0;
                        loader.remove();
                        isLoading = false;
                        fetchNextPageContent(gridContainer);
                    });
                }
            }
        });
    }

    // 标记所有内容已加载完毕
    function markAllContentLoaded(gridContainer) {
        allContentLoaded = true;
        isLoading = false;
        
        // 移除加载指示器
        const loader = document.querySelector('.infinite-loader');
        if (loader) loader.remove();
        
        // 添加"所有内容已加载"提示
        let loadedIndicator = document.querySelector('.all-loaded');
        if (!loadedIndicator) {
            loadedIndicator = document.createElement('div');
            loadedIndicator.className = 'all-loaded';
            loadedIndicator.textContent = '所有内容已加载完毕';
            gridContainer.appendChild(loadedIndicator);
        }
    }

    // 设置无限滚动
    function setupInfiniteScroll(gridContainer) {
        // 使用防抖函数优化滚动事件
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            // 如果所有内容已加载，不再处理滚动事件
            if (allContentLoaded) return;
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                // 当滚动到页面底部附近时加载更多
                if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - loadThreshold) && !isLoading) {
                    fetchNextPageContent(gridContainer);
                }
            }, 100); // 100ms防抖
        });

        // 初始加载时，如果内容不足一屏，主动加载更多
        setTimeout(() => {
            if (!allContentLoaded && document.body.offsetHeight < window.innerHeight * 1.5) {
                fetchNextPageContent(gridContainer);
            }
        }, 1000);
    }

    // 初始化布局
    function init() {
        // 强制移除侧边栏和分页条
        const removeElements = (selectors) => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el?.remove());
            });
        };

        // 移除侧边栏
        removeElements(['.aside', '.aside-wrapper', '#aside', '.sidebar']);
        // 移除分页条
        removeElements(['.paginator']);

        // 尝试从URL获取当前页码
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('p');
        if (pageParam && !isNaN(pageParam)) {
            currentPage = parseInt(pageParam);
        }

        // 找到当前页面的内容项
        const statusWrappers = document.querySelectorAll('.new-status.status-wrapper');
        const movieItems = document.querySelectorAll('.status-item[data-object-kind="1002"]:not(.processed)');
        const bookItems = document.querySelectorAll('.status-item[data-object-kind="1001"]:not(.processed)');
        const subjectItems = document.querySelectorAll('.subject-item:not(.processed)');
        const allItems = [...movieItems, ...bookItems, ...subjectItems];

        if (allItems.length > 0) {
            totalItemsLoaded = allItems.length;
            lastLoadedItemsCount = allItems.length;
            
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

            // 设置无限滚动
            setupInfiniteScroll(gridContainer);
        } else {
            // 如果没有找到初始内容，尝试直接加载第一页
            const gridContainer = document.createElement('div');
            gridContainer.className = 'content-grid-container';
            document.querySelector('#content')?.appendChild(gridContainer);
            setupInfiniteScroll(gridContainer);
            fetchNextPageContent(gridContainer);
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

    // 监听页面动态内容
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length && !allContentLoaded) {
                // 移除新出现的侧边栏
                const newSidebars = document.querySelectorAll('.aside, .aside-wrapper, #aside, .sidebar:not([removed])');
                newSidebars.forEach(sidebar => {
                    sidebar.setAttribute('removed', 'true');
                    sidebar.remove();
                });

                // 移除新出现的分页条
                const newPaginators = document.querySelectorAll('.paginator:not([removed])');
                newPaginators.forEach(paginator => {
                    paginator.setAttribute('removed', 'true');
                    paginator.remove();
                });

                // 处理新添加的内容项
                const newMovieItems = document.querySelectorAll('.status-item[data-object-kind="1002"]:not(.processed)');
                const newBookItems = document.querySelectorAll('.status-item[data-object-kind="1001"]:not(.processed)');
                const newItems = [...newMovieItems, ...newBookItems];

                if (newItems.length > 0) {
                    const gridContainer = document.querySelector('.content-grid-container');
                    if (gridContainer) {
                        newItems.forEach(item => {
                            item.classList.add('processed');
                            const card = processItem(item);
                            if (card) {
                                gridContainer.appendChild(card);
                                
                                // 隐藏原始内容容器
                                const wrapper = item.closest('.new-status.status-wrapper');
                                if (wrapper) {
                                    wrapper.classList.add('original-layout-container');
                                }
                            }
                        });
                    }
                }
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
    