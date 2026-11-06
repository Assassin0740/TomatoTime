/**
 * editor-provider.js —— 「这个文件该用什么打开」的唯一决策点
 *
 * 【2026-11-06 CR-020】重构前，打开一个文件有三条互不相识的路径：
 *   ① 图片：renderer.js 给每个 <img> 贴 onclick="zoomImage(...)"
 *   ② 压缩包：parse 时写死 data-archive="1"，点击走 openArchivePreview
 *   ③ 其它：一律 file:open → shell.openPath（永远想不到去调 PhotoCraft / PdfCraft）
 * 结果是「加一个新编辑器要改四处 if-else，漏一处就错位」（右键有、点击没有）。
 *
 * 现在把「用什么打开」收敛成一张表 + 一组纯函数，上层只调 providersFor() 和 open()。
 * 加第 14 个编辑器 = 表里加一行，调用点一个字不动。
 *
 * 本模块零 DOM、零 Node 依赖，纯字符串处理，可直接 node --test 单测。
 */
(function (root, factory) {
    const api = factory();
    // nodeIntegration 下渲染进程里 `module` 是存在的，必须两个都挂（CR-016 踩过这个坑）
    if (typeof window !== 'undefined') window.EditorProvider = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

    /** 能被内置看图/标注处理的位图格式 */
    const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'];

    /**
     * 本质是 ZIP 的容器格式。
     * 注意 docx / xlsx / pptx / apk 都在这里：它们既能「查看包内文件」，也可能有专属编辑器。
     * 同一个扩展名命中多个 provider 是正常的，菜单里会依次列出来。
     */
    const ARCHIVE_EXTS = [
        'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz',
        'apk', 'ipa', 'jar', 'war', 'xpi', 'vsix', 'crx', 'whl', 'epub',
        'docx', 'docm', 'xlsx', 'xlsm', 'pptx', 'pptm', 'odt', 'ods', 'odp', 'epub'
    ];

    const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'ogg', 'mkv', 'avi'];

    /**
     * 一张表。rank 越小越优先（用作「点击默认走哪个」）。
     *
     * kind:
     *   builtin  —— 在计时器自己里完成，直接调 JS 函数
     *   external —— 起一个独立进程（Craft 套件那 13 个）
     *   app      —— 用自定义协议唤起自家另一个程序（创作台）
     *   headless —— 不出界面，只产出结果（缩略图 / 格式转换），留给以后的 Rust 模块
     */
    const PROVIDERS = [
        // ---------------- 内置 ----------------
        {
            id: 'annotator',
            name: '标注',
            kind: 'builtin',
            exts: IMAGE_EXTS,
            rank: 10,
            hint: '画笔 / 裁剪 / 复制'
        },
        {
            id: 'archive',
            name: '查看压缩包内容',
            kind: 'builtin',
            exts: ARCHIVE_EXTS,
            rank: 20,
            hint: '左侧列出包内文件'
        },

        // ---------------- 外部：ArtCraft 套件 ----------------
        // exe 名用于探测；装了才会出现在菜单里，没装则置灰
        { id: 'photocraft', name: 'PhotoCraft', kind: 'external', exts: ['psd', 'psb', 'pcraft'], exe: 'photocraft', rank: 5, hint: '图层 / 修图' },
        { id: 'lightcraft', name: 'LightCraft', kind: 'external', exts: ['dng', 'cr2', 'cr3', 'arw', 'nef', 'raf', 'orf', 'rw2'], exe: 'lightcraft', rank: 5, hint: 'RAW 显影' },
        { id: 'pdfcraft', name: 'PdfCraft', kind: 'external', exts: ['pdf'], exe: 'pdfcraft', rank: 5, hint: 'PDF 阅读与编辑' },
        { id: 'vectorcraft', name: 'VectorCraft', kind: 'external', exts: ['ai', 'eps', 'svg'], exe: 'vectorcraft', rank: 30, hint: '矢量编辑' },
        { id: 'wordcraft', name: 'WordCraft', kind: 'external', exts: ['doc', 'docx', 'rtf', 'odt'], exe: 'wordcraft', rank: 30, hint: '文字处理' },
        { id: 'gridcraft', name: 'GridCraft', kind: 'external', exts: ['xls', 'xlsx', 'csv', 'ods'], exe: 'gridcraft', rank: 30, hint: '电子表格' },
        { id: 'deckcraft', name: 'DeckCraft', kind: 'external', exts: ['ppt', 'pptx', 'odp'], exe: 'deckcraft', rank: 30, hint: '演示文稿' },
        { id: 'designcraft', name: 'DesignCraft', kind: 'external', exts: ['indd', 'idml'], exe: 'designcraft', rank: 30, hint: '版式设计' },
        { id: 'filmcraft', name: 'FilmCraft', kind: 'external', exts: ['mkv', 'avi', 'mov', 'mp4'], exe: 'filmcraft', rank: 40, hint: '视频剪辑' },
        { id: 'soundcraft', name: 'SoundCraft', kind: 'external', exts: ['wav', 'mp3', 'flac', 'aiff', 'ogg', 'm4a'], exe: 'soundcraft', rank: 40, hint: '音频编辑' },
        { id: 'cadcraft', name: 'CADCraft', kind: 'external', exts: ['dwg', 'dxf', 'step', 'stp', 'iges'], exe: 'cadcraft', rank: 30, hint: 'CAD 制图' },
        { id: 'figcraft', name: 'FigCraft', kind: 'external', exts: ['fig', 'sketch'], exe: 'figcraft', rank: 30, hint: '界面设计' },
        { id: 'effectcraft', name: 'EffectCraft', kind: 'external', exts: ['aep', 'aepx'], exe: 'effectcraft', rank: 30, hint: '动效与合成' },
        { id: 'materialcraft', name: 'MaterialCraft', kind: 'external', exts: ['mtlx', 'sbsar'], exe: 'materialcraft', rank: 30, hint: '节点材质' },

        // ---------------- 兜底：永远排最后 ----------------
        {
            id: 'system',
            name: '用默认程序打开',
            kind: 'builtin',
            exts: ['*'],
            rank: 900,
            hint: '交给 Windows'
        },
        {
            // 【2026-11-06 CR-022】自家创作台：用自定义协议唤起，不占安装包体积。
            // rank 故意排在 system 之后 —— 点击文件的默认行为一个字都不改，
            // 想用创作台就从右键菜单进。
            id: 'workbench',
            name: '在创作台打开',
            kind: 'app',
            exts: ['*'],
            rank: 950,
            protocol: 'workbench',
            hint: '文件中枢 / 调度外部编辑器'
        }
    ];

    const BY_ID = Object.create(null);
    PROVIDERS.forEach(p => { BY_ID[p.id] = p; });

    /** 取小写扩展名。支持路径、file:// URL、带 query 的地址；没有扩展名返回 '' */
    function extOf(input) {
        let s = String(input == null ? '' : input);
        const cut = s.search(/[?#]/);
        if (cut >= 0) s = s.slice(0, cut);
        s = s.replace(/\\/g, '/');
        const base = s.slice(s.lastIndexOf('/') + 1);
        const dot = base.lastIndexOf('.');
        if (dot <= 0 || dot === base.length - 1) return '';
        const ext = base.slice(dot + 1).toLowerCase();
        return /^[a-z0-9]{1,12}$/.test(ext) ? ext : '';
    }

    function has(list, ext) {
        return !!ext && list.indexOf(ext) >= 0;
    }

    function isImageExt(ext) { return has(IMAGE_EXTS, String(ext || '').toLowerCase()); }
    function isArchiveExt(ext) { return has(ARCHIVE_EXTS, String(ext || '').toLowerCase()); }
    function isVideoExt(ext) { return has(VIDEO_EXTS, String(ext || '').toLowerCase()); }

    function isImageName(name) { return isImageExt(extOf(name)); }
    function isArchiveName(name) { return isArchiveExt(extOf(name)); }

    function matches(provider, ext) {
        if (!provider) return false;
        if (provider.exts.indexOf('*') >= 0) return true;
        return has(provider.exts, ext);
    }

    /**
     * 这个文件所有能打开它的方式，按 rank 升序。
     * 第一个就是「点击默认走哪个」，其余进右键菜单。
     */
    function providersFor(input) {
        const ext = extOf(input);
        return PROVIDERS
            .filter(p => matches(p, ext))
            .sort((a, b) => a.rank - b.rank);
    }

    /** 点击时的默认动作；没有匹配返回 null */
    function primaryProvider(input) {
        const list = providersFor(input);
        return list.length ? list[0] : null;
    }

    /** 所有外部程序（供主进程批量探测装没装） */
    function externalProviders() {
        return PROVIDERS.filter(p => p.kind === 'external');
    }

    function getById(id) {
        return BY_ID[id] || null;
    }

    /**
     * 菜单文字。同扩展名有多个候选时带上后缀，避免出现两行一模一样的「标注」。
     */
    function labelOf(provider, input) {
        if (!provider) return '';
        const ext = extOf(input).toUpperCase();
        if (!ext) return provider.name;
        return provider.name;
    }

    /**
     * 生成菜单项。返回 [{ provider, label, disabled, hint }]
     * installed: { photocraft: true | '/path/to/exe', ... }
     *   —— 内部建的 provider 不看这个字段（永远可用）；
     *      外部 provider 未出现或值为假，一律视为「未安装」。
     */
    function buildMenu(input, installed) {
        const list = providersFor(input);
        const flag = installed || {};
        return list.map(p => {
            const isExt = p.kind === 'external';
            const ok = isExt ? !!flag[p.id] : true;
            return {
                provider: p,
                label: isExt && !ok ? (p.name + '（未安装）') : p.name,
                disabled: !ok,
                hint: p.hint || ''
            };
        });
    }

    return {
        IMAGE_EXTS: IMAGE_EXTS,
        ARCHIVE_EXTS: ARCHIVE_EXTS,
        VIDEO_EXTS: VIDEO_EXTS,
        PROVIDERS: PROVIDERS,
        extOf: extOf,
        isImageExt: isImageExt,
        isArchiveExt: isArchiveExt,
        isVideoExt: isVideoExt,
        isImageName: isImageName,
        isArchiveName: isArchiveName,
        matches: matches,
        providersFor: providersFor,
        primaryProvider: primaryProvider,
        externalProviders: externalProviders,
        getById: getById,
        labelOf: labelOf,
        buildMenu: buildMenu
    };
});
