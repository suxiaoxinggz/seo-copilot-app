
import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { ImageSource, ImageApiKeys, ImageObject, Article, PixabayParams, UnsplashParams, KolarsParams, PollinationsParams, SavedImageSet, PostToPublish, Project, KeywordSubProject } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { fetchPixabayImages, fetchUnsplashImages, fetchKolorsImages, fetchPollinationsImages } from '../services/imageService';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Modal from './ui/Modal';
import { SettingsIcon, ExternalLinkIcon, DownloadIcon, CheckIcon, TrashIcon, ExpandIcon, ChevronDownIcon, PencilIcon } from './icons';
import Checkbox from './ui/Checkbox';
import Spinner from './ui/Spinner';
import Toggle from './ui/Toggle';

// Helper to download a blob
const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


// --- SUB-COMPONENTS ---
const ApiSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    apiKeys: ImageApiKeys;
    onSave: (keys: ImageApiKeys) => void;
}> = ({ isOpen, onClose, apiKeys, onSave }) => {
    const [keys, setKeys] = useState(apiKeys);

    useEffect(() => {
        setKeys(apiKeys);
    }, [apiKeys]);

    const handleSave = () => {
        onSave(keys);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="图片服务 API 设置">
            <div className="space-y-4">
                <Input
                    label="Kolors (SiliconFlow) API Key"
                    type="password"
                    placeholder="Enter your SiliconFlow API key"
                    value={keys[ImageSource.KOLARS]}
                    onChange={(e) => setKeys({ ...keys, [ImageSource.KOLARS]: e.target.value })}
                />
                <Input
                    label="Pixabay API Key"
                    type="password"
                    placeholder="Enter your Pixabay API key"
                    value={keys[ImageSource.PIXABAY]}
                    onChange={(e) => setKeys({ ...keys, [ImageSource.PIXABAY]: e.target.value })}
                />
                <Input
                    label="Unsplash Access Key"
                    type="password"
                    placeholder="Enter your Unsplash access key"
                    value={keys[ImageSource.UNSPLASH]}
                    onChange={(e) => setKeys({ ...keys, [ImageSource.UNSPLASH]: e.target.value })}
                />
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Pollinations.AI</label>
                    <p className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded-md">此服务无需 API 密钥。</p>
                 </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>取消</Button>
                    <Button variant="primary" onClick={handleSave}>保存</Button>
                </div>
            </div>
        </Modal>
    );
};

const ImageCard: React.FC<{
    image: ImageObject;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onViewImage: (image: ImageObject) => void;
}> = ({ image, isSelected, onToggleSelect, onViewImage }) => (
    <Card className="p-0 overflow-hidden relative group w-full h-full" >
        <div className="absolute top-2 left-2 z-20 cursor-default" onClick={(e) => e.stopPropagation()}>
            <Checkbox
                id={`img-select-${image.id}`}
                checked={isSelected}
                onChange={() => onToggleSelect(image.id)}
                className="transform scale-125"
                aria-label={`Select image ${image.alt_description}`}
            />
        </div>
        <div 
          className="w-full h-full cursor-pointer"
          onClick={() => onViewImage(image)}
        >
            <div className={`absolute inset-0 bg-black transition-opacity ${isSelected ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'}`}></div>
            <div className={`absolute inset-0 ring-2 ring-offset-2 ring-offset-gray-800 transition-all ${isSelected ? 'ring-blue-500' : 'ring-transparent'}`}></div>
            
            <img src={image.url_regular} alt={image.alt_description} className="w-full h-full object-cover" loading="lazy"/>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-sm pointer-events-none">
                <p className="font-semibold text-white truncate">{image.alt_description}</p>
                <div className="flex justify-between items-center mt-1 text-gray-300">
                    <a href={image.author_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 flex items-center gap-1 text-xs pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <span>{image.author_name}</span>
                    </a>
                    {image.source_url && (
                        <a href={image.source_url} target="_blank" rel="noopener noreferrer" title="View on source platform" className="hover:text-blue-400 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                            <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    </Card>
);

const ImageControls: React.FC<{
    source: ImageSource;
    setSource: (source: ImageSource) => void;
    params: any;
    setParams: (params: any) => void;
}> = ({ source, setSource, params, setParams }) => {
    const showNegativePrompt = source === ImageSource.KOLARS || source === ImageSource.POLLINATIONS;

    return (
        <Card className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">配置参数</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Select label="图片来源" value={source} onChange={(e) => setSource(e.target.value as ImageSource)}>
                    {Object.values(ImageSource).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                 <Input
                    label="图片数量"
                    type="number"
                    min="1"
                    max={source === ImageSource.KOLARS ? 4 : 50}
                    value={params.per_page}
                    onChange={(e) => setParams({ ...params, per_page: parseInt(e.target.value, 10)})}
                />
            </div>

            {showNegativePrompt && (
                <div className="mt-4">
                    <Input
                        label="排除关键词 (Negative Prompt)"
                        placeholder="e.g., blurry, watermark, distorted"
                        value={params.negative_prompt}
                        onChange={(e) => setParams({ ...params, negative_prompt: e.target.value })}
                    />
                </div>
            )}
            
            {/* Dynamic Controls */}
            <div className="mt-4 space-y-4 pt-4 border-t border-gray-700/50">
                {source === ImageSource.PIXABAY && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="排序方式" value={(params as PixabayParams).order} onChange={(e) => setParams({...params, order: e.target.value as PixabayParams['order']})}>
                            <option value="popular">热门</option>
                            <option value="latest">最新</option>
                        </Select>
                        <Select label="图片朝向" value={(params as PixabayParams).orientation} onChange={(e) => setParams({...params, orientation: e.target.value as PixabayParams['orientation']})}>
                            <option value="all">所有</option>
                            <option value="horizontal">横向</option>
                            <option value="vertical">纵向</option>
                        </Select>
                        <Toggle label="编辑精选" enabled={(params as PixabayParams).editors_choice} setEnabled={(e) => setParams({...params, editors_choice: e})} />
                        <Toggle label="内容过滤" enabled={(params as PixabayParams).safesearch} setEnabled={(e) => setParams({...params, safesearch: e})} />
                    </div>
                )}
                 {source === ImageSource.UNSPLASH && (
                     <Select label="图片朝向" value={(params as UnsplashParams).orientation} onChange={(e) => setParams({...params, orientation: e.target.value as UnsplashParams['orientation']})}>
                        <option value="landscape">横向</option>
                        <option value="portrait">纵向</option>
                        <option value="squarish">方形</option>
                    </Select>
                )}
                {source === ImageSource.KOLARS && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="图像尺寸" value={params.image_size} onChange={(e) => setParams({...params, image_size: e.target.value as KolarsParams['image_size']})}>
                            <option value="1024x1024">1024x1024 (1:1)</option>
                            <option value="768x1024">768x1024 (3:4)</option>
                            <option value="1024x768">1024x768 (4:3)</option>
                        </Select>
                         <Input label="推理步数 (20-50)" type="number" min="20" max="50" value={params.num_inference_steps} onChange={e => setParams({...params, num_inference_steps: parseInt(e.target.value)})} />
                         <Input label="指令强度 (7-10)" type="number" min="7" max="10" step="0.1" value={params.guidance_scale} onChange={e => setParams({...params, guidance_scale: parseFloat(e.target.value)})} />
                         <Input label="随机种子 (可选)" type="number" placeholder="留空则随机" value={params.seed || ''} onChange={e => setParams({...params, seed: e.target.value ? parseInt(e.target.value) : undefined})} />
                         <Toggle label="增强优化" enabled={params.enhance} setEnabled={(e) => setParams({...params, enhance: e})} />
                         <Toggle label="去除水印" enabled={params.nologo} setEnabled={(e) => setParams({...params, nologo: e})} />
                         <Toggle label="透明背景" enabled={params.transparent} setEnabled={(e) => setParams({...params, transparent: e})} />
                         <Toggle label="设为私密" enabled={params.private} setEnabled={(e) => setParams({...params, private: e})} />
                    </div>
                )}
                {source === ImageSource.POLLINATIONS && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="模型" value={params.model} onChange={(e) => setParams({...params, model: e.target.value as PollinationsParams['model']})}>
                            <option value="flux">Flux</option>
                            <option value="gptimage">GPT Image</option>
                            <option value="Kwai-Kolors/Kolors">Kolors</option>
                            <option value="kontext">Kontext</option>
                        </Select>
                         <Input label="随机种子 (可选)" type="number" placeholder="留空则随机" value={params.seed || ''} onChange={e => setParams({...params, seed: e.target.value ? parseInt(e.target.value) : undefined})} />
                         <Input label="宽度 (512-2048)" type="number" min="512" max="2048" value={params.width} onChange={e => setParams({...params, width: parseInt(e.target.value)})} />
                         <Input label="高度 (512-2048)" type="number" min="512" max="2048" value={params.height} onChange={e => setParams({...params, height: parseInt(e.target.value)})} />
                         <Toggle label="增强优化" enabled={params.enhance} setEnabled={(e) => setParams({...params, enhance: e})} />
                         <Toggle label="去除水印" enabled={params.nologo} setEnabled={(e) => setParams({...params, nologo: e})} />
                         <Toggle label="透明背景" enabled={params.transparent} setEnabled={(e) => setParams({...params, transparent: e})} />
                         <Toggle label="设为私密" enabled={params.private} setEnabled={(e) => setParams({...params, private: e})} />
                     </div>
                )}
            </div>
        </Card>
    );
};

const markdownToHtml = (text: string): string => {
    if (!text) return '';
    
    let html = text
        // Escape basic HTML to prevent injection issues if user input contains it
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        // Bold and Italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Split by one or more blank lines (handling different newline conventions)
    const blocks = html.split(/(?:\r?\n\s*){2,}/);

    return blocks.map(block => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return '';

        // Handle headings
        if (trimmedBlock.startsWith('### ')) return `<h3>${trimmedBlock.substring(4)}</h3>`;
        if (trimmedBlock.startsWith('## ')) return `<h2>${trimmedBlock.substring(3)}</h2>`;
        if (trimmedBlock.startsWith('# ')) return `<h1>${trimmedBlock.substring(2)}</h1>`;

        // Don't re-wrap existing HTML tags (like our figure)
        if (trimmedBlock.startsWith('&lt;figure') && trimmedBlock.endsWith('&lt;/figure&gt;')) {
           // Un-escape the figure tag itself
           return trimmedBlock.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        
        // This is a special case for our placeholders so they don't get wrapped in <p> tags
        if (trimmedBlock.startsWith('%%IMAGE_PLACEHOLDER_') && trimmedBlock.endsWith('%%')) {
            return trimmedBlock;
        }

        // For standard text blocks, wrap in <p> and replace single newlines with <br> for soft breaks.
        return `<p>${trimmedBlock.replace(/\r?\n/g, '<br />')}</p>`;
    }).join('\n');
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- MAIN COMPONENT ---
const ImageTextProcessor: React.FC = () => {
    const context = useContext(AppContext);
    const [apiKeys, setApiKeys] = useLocalStorage<ImageApiKeys>('image_api_keys', {
        [ImageSource.PIXABAY]: '',
        [ImageSource.UNSPLASH]: '',
        [ImageSource.KOLARS]: '',
        [ImageSource.POLLINATIONS]: '',
    });
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    
    // --- State Management ---
    const [source, setSource] = useState<ImageSource>(ImageSource.POLLINATIONS);
    const [params, setParams] = useState<any>({});
    const [searchTerm, setSearchTerm] = useState('');

    const [images, setImages] = useState<ImageObject[]>([]);
    const [selectedImages, setSelectedImages] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [articleContent, setArticleContent] = useState('');
    const [keywordContext, setKeywordContext] = useState('');
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

    const [insertionStrategy, setInsertionStrategy] = useState<'h2_before' | 'p_before' | 'end_of_article'>('h2_before');
    const [finalPreview, setFinalPreview] = useState('');
    
    const [viewingImage, setViewingImage] = useState<ImageObject | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isDirty, setIsDirty] = useState(true);

    // Save Images Modal State
    const [isSaveImagesModalOpen, setIsSaveImagesModalOpen] = useState(false);
    const [imageSetTag, setImageSetTag] = useState("");
    const [saveImagesParentProjectId, setSaveImagesParentProjectId] = useState('');
    const [saveImagesSubProjectId, setSaveImagesSubProjectId] = useState('');
    const [newSaveImagesParentProjectName, setNewSaveImagesParentProjectName] = useState('');
    const [newSaveImagesSubProjectName, setNewSaveImagesSubProjectName] = useState('');
    const [imageNameInputs, setImageNameInputs] = useState<Record<string, string>>({});


    // Save Post Modal State
    const [isSavePostModalOpen, setIsSavePostModalOpen] = useState(false);
    const [postTitle, setPostTitle] = useState("");
    const [savePostParentProjectId, setSavePostParentProjectId] = useState('');
    const [savePostSubProjectId, setSavePostSubProjectId] = useState('');
    const [newSavePostParentProjectName, setNewSavePostParentProjectName] = useState('');
    const [newSavePostSubProjectName, setNewSavePostSubProjectName] = useState('');

    if (!context) return null;
    const { articles, projects, keywordLibrary, fetchData, supabase, session } = context;

    // Set default parameters when the component loads or when the source changes
    useEffect(() => {
        const commonDefaults = {
            per_page: 12,
            negative_prompt: '',
        };

        let sourceDefaults: any;

        switch(source) {
            case ImageSource.PIXABAY:
                sourceDefaults = { order: 'popular', orientation: 'horizontal', safesearch: true, editors_choice: false };
                break;
            case ImageSource.UNSPLASH:
                 sourceDefaults = { orientation: 'landscape' };
                 break;
            case ImageSource.KOLARS:
                sourceDefaults = { model: 'Kwai-Kolors/Kolors', image_size: '1024x1024', num_inference_steps: 30, guidance_scale: 7.5, enhance: false, nologo: true, transparent: false, private: false, seed: undefined };
                break;
            case ImageSource.POLLINATIONS:
                 sourceDefaults = { model: 'flux', width: 1024, height: 1024, nologo: true, enhance: false, transparent: false, private: false, seed: undefined };
                 break;
            default:
                sourceDefaults = {};
        }
        setParams({ ...commonDefaults, ...sourceDefaults });
        setError(null); // Clear error when switching source
        setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source]);


    const handleGenerateClick = async () => {
        if (!searchTerm.trim()) {
            setImages([]);
            return;
        };

        setIsLoading(true);
        setError(null);
        setSelectedImages({});
        try {
            let result: ImageObject[] = [];
            const currentParams = { ...params, query: searchTerm, prompt: searchTerm };
            
            switch(source) {
                case ImageSource.PIXABAY:
                    if (!apiKeys[ImageSource.PIXABAY]) throw new Error(`Pixabay API Key is not provided.`);
                    result = await fetchPixabayImages(currentParams, apiKeys[ImageSource.PIXABAY]);
                    break;
                case ImageSource.UNSPLASH:
                    if (!apiKeys[ImageSource.UNSPLASH]) throw new Error(`Unsplash API Key is not provided.`);
                    result = await fetchUnsplashImages(currentParams, apiKeys[ImageSource.UNSPLASH]);
                    break;
                case ImageSource.KOLARS:
                    if (!apiKeys[ImageSource.KOLARS]) throw new Error(`Kolors (SiliconFlow) API Key is not provided.`);
                    result = await fetchKolorsImages(currentParams, apiKeys[ImageSource.KOLARS]);
                    break;
                case ImageSource.POLLINATIONS:
                    result = await fetchPollinationsImages(currentParams);
                    break;
            }
            setImages(result);
        } catch (err) {
            let message = err instanceof Error ? err.message : '发生未知错误。';
            if (message.includes('API Key is not provided') || message.includes('API Key is not set')) {
                message = `请在“API 设置”中配置 ${source} 的 API 密钥。`;
            }
            setError(message);
            setImages([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectArticle = (article: Article) => {
        setArticleContent(article.content);
        setKeywordContext(article.keywordContext);
        setPostTitle(article.title);
        setSavePostParentProjectId(article.parentProjectId);
        setSavePostSubProjectId(article.subProjectId);
        setIsLibraryModalOpen(false);
        setIsDirty(true);
    };

    const handleToggleSelectImage = (id: string) => {
        setSelectedImages(prev => ({...prev, [id]: !prev[id]}));
        setIsDirty(true);
    };
    
    const getPreviewHtml = useCallback((imageBase64Map?: Map<string, string>) => {
        const selected = images.filter(img => selectedImages[img.id]);

        const createFigureHtml = (img: ImageObject): string => {
            const src = imageBase64Map ? imageBase64Map.get(img.id) || img.url_full : img.url_full;
            return `<figure><img src="${src}" alt="${img.alt_description}" /><figcaption>Image by <a href="${img.author_url}" target="_blank" rel="noopener noreferrer">${img.author_name}</a> on ${img.source_platform}</figcaption></figure>`;
        };
        
        const imagePlaceholder = (index: number) => `%%IMAGE_PLACEHOLDER_${index}%%`;

        let tempContent = articleContent;
        if (selected.length > 0) {
            switch (insertionStrategy) {
                case 'h2_before': {
                    let h2Count = 0;
                    tempContent = tempContent.replace(/^(## .*$)/gm, (match) => {
                        if (h2Count < selected.length) {
                            const placeholder = imagePlaceholder(h2Count % selected.length);
                            h2Count++;
                            return placeholder + '\n\n' + match;
                        }
                        return match;
                    });
                    break;
                }
                case 'end_of_article': {
                    const placeholders = selected.map((_, index) => imagePlaceholder(index));
                    tempContent += '\n\n' + placeholders.join('\n\n');
                    break;
                }
                case 'p_before':
                    // This is handled post-conversion to HTML.
                    break;
            }
        }

        let htmlBody = markdownToHtml(tempContent);

        // Now, replace placeholders with actual HTML figures.
        selected.forEach((img, index) => {
            const placeholder = imagePlaceholder(index);
            const figureHtml = createFigureHtml(img);
            htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), figureHtml);
        });
        
        if (insertionStrategy === 'p_before' && selected.length > 0) {
            let pCount = 0;
            htmlBody = htmlBody.replace(/<p>.*?<\/p>/g, (match) => {
                if (match.includes('<figure>')) return match; // Don't insert before an existing figure
                if (pCount < selected.length) {
                    const figureHtml = createFigureHtml(selected[pCount % selected.length]);
                    pCount++;
                    return figureHtml + '\n' + match;
                }
                return match;
            });
        }
        
        const keywordHtml = keywordContext.trim()
            ? `<details open style="margin-bottom: 2em; background-color: #f0f4f8; border: 1px solid #d1dce5; border-radius: 8px; padding: 1em;">
                   <summary style="cursor: pointer; font-weight: bold; color: #1a202c; margin-bottom: 0.5em;">关键词上下文</summary>
                   <pre style="background-color: #ffffff; color: #1a202c; padding: 1em; border-radius: 4px; white-space: pre-wrap; word-break: break-all; font-family: monospace;">${keywordContext}</pre>
               </details>`
            : '';

        return keywordHtml + htmlBody;
    }, [articleContent, images, selectedImages, insertionStrategy, keywordContext]);


    useEffect(() => {
        if (isDirty) {
            setFinalPreview(getPreviewHtml());
            setIsDirty(false);
        }
    }, [isDirty, getPreviewHtml]);
    
    const downloadSelectedImages = async () => {
        const selected = images.filter(img => selectedImages[img.id]);
        for (const image of selected) {
            try {
                const response = await fetch(image.url_full);
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;

                const userDefinedName = imageNameInputs[image.id];
                const extension = (blob.type.split('/')[1] || 'jpg').split('+')[0]; // handle svg+xml
                const filename = userDefinedName 
                    ? `${userDefinedName}.${extension}`
                    : `${image.alt_description.replace(/[^a-z0-9]/gi, '_').slice(0, 50) || image.id}.${extension}`;
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (err) {
                console.error(`Could not download image ${image.id}:`, err);
                setError(`Could not download image: ${image.alt_description}`);
            }
        }
    };
    
    const processAndGetHtmlWithBase64 = async (convertToWebp: boolean = true): Promise<string> => {
        const selected = images.filter(img => selectedImages[img.id]);
        const imageBase64Map = new Map<string, string>();

        if (selected.length > 0) {
            const imageFetchPromises = selected.map(image =>
                fetch(image.url_full)
                    .then(response => {
                        if (!response.ok) throw new Error(`Failed to fetch image: ${image.url_full}`);
                        return response.blob();
                    })
                    .then(blob => {
                        if (convertToWebp && blob.type !== 'image/webp') {
                            return new Promise<string>((resolve) => {
                                const img = new Image();
                                const url = URL.createObjectURL(blob);
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx) {
                                        URL.revokeObjectURL(url);
                                        console.warn(`Could not get canvas context for ${image.id}, falling back to original format.`);
                                        blobToBase64(blob).then(resolve);
                                        return;
                                    }
                                    ctx.drawImage(img, 0, 0);
                                    const webpDataUrl = canvas.toDataURL('image/webp', 0.85);
                                    URL.revokeObjectURL(url);
                                    resolve(webpDataUrl);
                                };
                                img.onerror = () => {
                                    URL.revokeObjectURL(url);
                                    console.warn(`Image load error for WebP conversion on ${image.id}, falling back to original format.`);
                                    blobToBase64(blob).then(resolve);
                                };
                                img.src = url;
                            });
                        }
                        return blobToBase64(blob);
                    })
                    .then(base64 => {
                        imageBase64Map.set(image.id, base64);
                    })
                    .catch(err => {
                        console.error(`Skipping image ${image.id} due to fetch/conversion error:`, err);
                        imageBase64Map.set(image.id, image.url_full); // Ultimate fallback to URL
                    })
            );
            await Promise.all(imageFetchPromises);
        }
        return getPreviewHtml(imageBase64Map);
    };


    const exportAsHtml = async () => {
        if (!finalPreview) return;
        setIsProcessing(true);
        setError(null);
        try {
            const htmlBody = await processAndGetHtmlWithBase64(true);
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${postTitle || 'Article with Images'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; background-color: #fdfdfd; color: #111; }
        h1, h2, h3 { line-height: 1.2; color: #000; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
        figure { margin: 1.5em 0; text-align: center; }
        figcaption { font-size: 0.9em; color: #555; text-align: center; margin-top: 0.5em; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        p { margin: 1em 0; }
        details { margin-bottom: 2em; background-color: #f0f4f8; border: 1px solid #d1dce5; border-radius: 8px; padding: 1em; }
        summary { cursor: pointer; font-weight: bold; color: #1a202c; margin-bottom: 0.5em; }
        pre { background-color: #ffffff; color: #1a202c; padding: 1em; border-radius: 4px; white-space: pre-wrap; word-break: break-all; font-family: monospace; }
    </style>
</head>
<body>
    ${htmlBody}
</body>
</html>`;
            
            const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
            downloadBlob(htmlBlob, `${(postTitle || `article-with-images`).replace(/[^a-z0-9]/gi, '_').slice(0, 50)}-${new Date().toISOString().split('T')[0]}.html`);

        } catch (err) {
            setError(err instanceof Error ? `Export failed: ${err.message}` : 'An unknown error occurred during export.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSaveImages = async () => {
        if (!supabase || !session) return;
        setIsProcessing(true);

        try {
            let finalParentProjectId = saveImagesParentProjectId;
            let finalSubProjectId = saveImagesSubProjectId;

            if (saveImagesParentProjectId === 'create_new') {
                const newProject: Omit<Project, 'user_id'> = {
                    id: `proj-${Date.now()}`,
                    name: newSaveImagesParentProjectName.trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const { data, error } = await supabase.from('projects').insert({ ...newProject, user_id: session.user.id }).select().single();
                if (error) throw error;
                finalParentProjectId = data.id;
            }

            if (saveImagesSubProjectId === 'create_new') {
                 const newSubProject: Omit<KeywordSubProject, 'user_id'> = {
                    id: `subproj-${Date.now()}`,
                    name: newSaveImagesSubProjectName.trim(),
                    parentProjectId: finalParentProjectId,
                    savedAt: new Date().toISOString(),
                    modelUsed: 'Image Library',
                    keywords: [],
                 };
                 const { data, error } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id }).select().single();
                 if (error) throw error;
                 finalSubProjectId = data.id;
            }

            const selectedOriginalImages = images.filter(img => selectedImages[img.id]);
            
            const imageSavePromises = selectedOriginalImages.map(async (image) => {
                let base64Data: string | undefined = undefined;
                try {
                    const response = await fetch(image.url_full);
                    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                    const blob = await response.blob();
                    base64Data = await blobToBase64(blob);
                } catch (err) {
                    console.error(`Could not pre-fetch image ${image.id}, it may fail to publish.`, err);
                }
                return {
                    ...image,
                    userDefinedName: imageNameInputs[image.id] || '',
                    base64: base64Data,
                };
            });
            
            const imagesToSave = await Promise.all(imageSavePromises);

            const newSet: Omit<SavedImageSet, 'user_id'> = {
                id: `imgset-${Date.now()}`,
                name: imageSetTag,
                searchTermOrPrompt: searchTerm,
                images: imagesToSave, 
                createdAt: new Date().toISOString(),
                parentProjectId: finalParentProjectId,
                subProjectId: finalSubProjectId,
                publishedDestinations: [],
            };

            const { error } = await supabase.from('saved_image_sets').insert({ ...newSet, user_id: session.user.id });
            if (error) throw error;
            
            await fetchData();
            setIsSaveImagesModalOpen(false);
            setImageSetTag("");
            setImageNameInputs({});

        } catch (err) {
            alert(`Save failed: ${(err as Error).message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSavePost = async () => {
        if (!postTitle.trim() || !finalPreview || !supabase || !session) {
            alert("Please provide a title for the post.");
            return;
        }
        setIsProcessing(true);
        setError(null);
        
        try {
            let finalParentProjectId = savePostParentProjectId;
            let finalSubProjectId = savePostSubProjectId;
            
            if (savePostParentProjectId === 'create_new') {
                if (!newSavePostParentProjectName.trim()) {
                    alert("Please provide a name for the new parent project."); throw new Error("Validation failed");
                }
                const newProject: Omit<Project, 'user_id'> = {
                    id: `proj-${Date.now()}`,
                    name: newSavePostParentProjectName.trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const { data, error } = await supabase.from('projects').insert({ ...newProject, user_id: session.user.id }).select().single();
                if(error) throw error;
                finalParentProjectId = data.id;
            }

            if (savePostSubProjectId === 'create_new') {
                 if (!newSavePostSubProjectName.trim()) {
                    alert("Please provide a name for the new sub-project."); throw new Error("Validation failed");
                }
                 const newSubProject: Omit<KeywordSubProject, 'user_id'> = {
                    id: `subproj-${Date.now()}`,
                    name: newSavePostSubProjectName.trim(),
                    parentProjectId: finalParentProjectId,
                    savedAt: new Date().toISOString(),
                    modelUsed: 'Image-Text Post',
                    keywords: [],
                 };
                 const { data, error } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id }).select().single();
                 if (error) throw error;
                 finalSubProjectId = data.id;
            }

            const htmlContentWithBase64 = await processAndGetHtmlWithBase64(true);
            const newPost: Omit<PostToPublish, 'user_id'> = {
                id: `post-${Date.now()}`,
                title: postTitle,
                htmlContent: htmlContentWithBase64,
                markdownContent: articleContent,
                keywordContext: keywordContext,
                usedImages: images.filter(img => selectedImages[img.id]),
                createdAt: new Date().toISOString(),
                parentProjectId: finalParentProjectId,
                subProjectId: finalSubProjectId,
                publishedDestinations: [],
            };
            
            const { error } = await supabase.from('posts_to_publish').insert({ ...newPost, user_id: session.user.id });
            if (error) throw error;
            
            await fetchData();
            setIsSavePostModalOpen(false);
            setPostTitle("");

        } catch (err) {
             setError(err instanceof Error ? `Save failed: ${err.message}` : 'An unknown error occurred during save.');
        } finally {
            setIsProcessing(false);
        }
    };

    const selectedImageObjects = useMemo(() => {
        return images.filter(img => selectedImages[img.id]);
    }, [images, selectedImages]);

    const numSelected = selectedImageObjects.length;
    
    const uniqueImageSetTags = useMemo(() => {
        return [...new Set(context.savedImageSets.map(s => s.name))];
    }, [context.savedImageSets]);

    const isSaveImagesDisabled = useMemo(() => {
        if (!imageSetTag.trim()) return true;
        if (!saveImagesParentProjectId) return true;
        if (saveImagesParentProjectId === 'create_new' && !newSaveImagesParentProjectName.trim()) return true;
        if (!saveImagesSubProjectId) return true;
        if (saveImagesSubProjectId === 'create_new' && !newSaveImagesSubProjectName.trim()) return true;
        return isProcessing;
    }, [imageSetTag, saveImagesParentProjectId, saveImagesSubProjectId, newSaveImagesParentProjectName, newSaveImagesSubProjectName, isProcessing]);
    
    const isSavePostDisabled = useMemo(() => {
        if (!postTitle.trim()) return true;
        if (!savePostParentProjectId) return true;
        if (savePostParentProjectId === 'create_new' && !newSavePostParentProjectName.trim()) return true;
        if (!savePostSubProjectId) return true;
        if (savePostSubProjectId === 'create_new' && !newSavePostSubProjectName.trim()) return true;
        return isProcessing;
    }, [postTitle, savePostParentProjectId, savePostSubProjectId, newSavePostParentProjectName, newSavePostSubProjectName, isProcessing]);


    const renderGallery = () => (
         isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Spinner />
                <p className="mt-4">正在加载图片...</p>
            </div>
        ) : images.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
                {images.map(img => (
                    <div key={img.id} className="w-32 h-32">
                        <ImageCard image={img} isSelected={!!selectedImages[img.id]} onToggleSelect={handleToggleSelectImage} onViewImage={setViewingImage}/>
                    </div>
                ))}
            </div>
        ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-center p-4">
                <p>{error ? '' : searchTerm ? '没有找到图片。' : '输入关键词以查找或生成图片。'}</p>
            </div>
        )
    );

    return (
        <div className="flex h-full font-sans">
             {/* --- Modals --- */}
            <ApiSettingsModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} apiKeys={apiKeys} onSave={setApiKeys} />
            
            <Modal isOpen={isLibraryModalOpen} onClose={() => setIsLibraryModalOpen(false)} title="从文章库导入">
                <div className="max-h-[60vh] overflow-y-auto">
                    {articles.length > 0 ? (
                        <ul className="space-y-2">
                            {articles.map(a => (
                                <li key={a.id} className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer" onClick={() => handleSelectArticle(a)}>
                                    <p className="font-semibold text-white">{a.title}</p>
                                    <p className="text-sm text-gray-400">创建于: {new Date(a.createdAt).toLocaleDateString()}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center">您的文章库是空的。</p>}
                </div>
            </Modal>

            <Modal isOpen={!!viewingImage} onClose={() => setViewingImage(null)} title={viewingImage?.alt_description || '图片预览'}>
                {viewingImage && (
                    <div className="overflow-auto max-h-[80vh]">
                        <img src={viewingImage.url_full} alt={viewingImage.alt_description} className="mx-auto rounded-lg" />
                        <div className="mt-4 p-4 bg-gray-900 rounded-lg text-sm">
                            <p><strong>作者:</strong> <a href={viewingImage.author_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{viewingImage.author_name} <ExternalLinkIcon className="inline w-4 h-4"/></a></p>
                            <p><strong>来源:</strong> {viewingImage.source_platform}</p>
                            {viewingImage.source_url && <p><strong>来源链接:</strong> <a href={viewingImage.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">查看原图 <ExternalLinkIcon className="inline w-4 h-4"/></a></p>}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Save Images Modal */}
             <Modal isOpen={isSaveImagesModalOpen} onClose={() => setIsSaveImagesModalOpen(false)} title={`保存 ${numSelected} 张图片`}>
                <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                    <Input 
                        label="图片集名称 (用于分组)" 
                        value={imageSetTag}
                        onChange={(e) => setImageSetTag(e.target.value)}
                        placeholder="e.g., Cozy Bedroom Ideas"
                        list="image-set-tags-list"
                        autoFocus
                    />
                    <datalist id="image-set-tags-list">
                        {uniqueImageSetTags.map(tag => <option key={tag} value={tag} />)}
                    </datalist>
                    
                    <div className="space-y-2 pt-2 border-t border-gray-700">
                        <h4 className="font-semibold text-gray-300">图片文件名 (可选)</h4>
                        {selectedImageObjects.map(img => (
                             <Input 
                                key={img.id}
                                label={img.alt_description}
                                value={imageNameInputs[img.id] || ''}
                                onChange={(e) => setImageNameInputs({...imageNameInputs, [img.id]: e.target.value})}
                                placeholder="输入文件名 (不含扩展名)"
                            />
                        ))}
                    </div>

                    <Select
                        label="父项目"
                        value={saveImagesParentProjectId}
                        onChange={e => {setSaveImagesParentProjectId(e.target.value); setSaveImagesSubProjectId('');}}
                    >
                         <option value="">选择父项目...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="create_new">+ 创建新项目</option>
                    </Select>
                     {saveImagesParentProjectId === 'create_new' && (
                        <div className="pl-4 border-l-2 border-gray-600">
                             <Input label="新父项目名称" value={newSaveImagesParentProjectName} onChange={e => setNewSaveImagesParentProjectName(e.target.value)} />
                        </div>
                    )}
                     {saveImagesParentProjectId && saveImagesParentProjectId !== 'create_new' && (
                        <Select
                            label="子项目"
                            value={saveImagesSubProjectId}
                            onChange={e => setSaveImagesSubProjectId(e.target.value)}
                        >
                             <option value="">选择子项目...</option>
                             {keywordLibrary.filter(sp => sp.parentProjectId === saveImagesParentProjectId).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                             <option value="create_new">+ 创建新子项目</option>
                        </Select>
                    )}
                    {saveImagesSubProjectId === 'create_new' && (
                        <div className="pl-4 border-l-2 border-gray-600">
                            <Input label="新子项目名称" value={newSaveImagesSubProjectName} onChange={e => setNewSaveImagesSubProjectName(e.target.value)} />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setIsSaveImagesModalOpen(false)}>取消</Button>
                        <Button onClick={handleSaveImages} isLoading={isProcessing} disabled={isSaveImagesDisabled}>保存图片集</Button>
                    </div>
                </div>
            </Modal>
            
             {/* Save Post Modal */}
            <Modal isOpen={isSavePostModalOpen} onClose={() => setIsSavePostModalOpen(false)} title="保存图文">
                 <div className="space-y-4">
                    <Input label="文章标题" value={postTitle} onChange={e => setPostTitle(e.target.value)} autoFocus />
                    
                    <Select
                        label="父项目"
                        value={savePostParentProjectId}
                        onChange={e => {setSavePostParentProjectId(e.target.value); setSavePostSubProjectId('');}}
                    >
                         <option value="">选择父项目...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="create_new">+ 创建新项目</option>
                    </Select>
                     {savePostParentProjectId === 'create_new' && (
                        <div className="pl-4 border-l-2 border-gray-600">
                             <Input label="新父项目名称" value={newSavePostParentProjectName} onChange={e => setNewSavePostParentProjectName(e.target.value)} />
                        </div>
                    )}
                     {savePostParentProjectId && savePostParentProjectId !== 'create_new' && (
                        <Select
                            label="子项目"
                            value={savePostSubProjectId}
                            onChange={e => setSavePostSubProjectId(e.target.value)}
                        >
                             <option value="">选择子项目...</option>
                             {keywordLibrary.filter(sp => sp.parentProjectId === savePostParentProjectId).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                             <option value="create_new">+ 创建新子项目</option>
                        </Select>
                    )}
                    {savePostSubProjectId === 'create_new' && (
                        <div className="pl-4 border-l-2 border-gray-600">
                            <Input label="新子项目名称" value={newSavePostSubProjectName} onChange={e => setNewSavePostSubProjectName(e.target.value)} />
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setIsSavePostModalOpen(false)}>取消</Button>
                        <Button onClick={handleSavePost} isLoading={isProcessing} disabled={isSavePostDisabled}>保存</Button>
                    </div>
                 </div>
            </Modal>
             
            <Modal isOpen={isEditorModalOpen} onClose={() => setIsEditorModalOpen(false)} title="放大并编辑内容">
                <div className="h-[75vh] flex flex-col">
                    <textarea
                        value={articleContent}
                        onChange={(e) => {
                            setArticleContent(e.target.value);
                            setIsDirty(true);
                        }}
                        className="w-full flex-grow bg-gray-900 border border-gray-600 rounded-md p-3 text-base resize-none"
                        autoFocus
                    />
                </div>
            </Modal>
            
            {/* --- Main Layout --- */}
            <div className="w-1/3 min-w-[400px] max-w-[500px] bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6">
                {/* Article Input */}
                <Card>
                    <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-bold text-white">文章内容</h2>
                            <Button size="sm" variant="secondary" onClick={() => setIsLibraryModalOpen(true)}>从库中提取</Button>
                    </div>
                    <textarea
                        value={articleContent}
                        onChange={e => {setArticleContent(e.target.value); setIsDirty(true);}}
                        rows={8}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm"
                        placeholder="在此处粘贴您的文章内容..."
                    />
                </Card>

                {keywordContext && (
                    <Card>
                        <h2 className="text-xl font-bold text-white mb-2">对应的关键词库</h2>
                        <div className="max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded-md p-3 text-sm">
                            <pre className="whitespace-pre-wrap text-gray-300 font-sans">{keywordContext}</pre>
                        </div>
                    </Card>
                )}

                {/* Search & Controls */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">图文生成</h2>
                        <Button size="sm" variant="secondary" onClick={() => setIsApiModalOpen(true)}>
                            <SettingsIcon className="w-5 h-5" />
                        </Button>
                    </div>
                    <div>
                        <label htmlFor="search-term" className="block text-sm font-medium text-gray-300 mb-1">
                            核心搜索词 (或 Prompt)
                        </label>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <Input
                                    id="search-term"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
                                    placeholder="e.g., a cozy bedroom with a large window"
                                />
                            </div>
                            <Button onClick={handleGenerateClick} isLoading={isLoading}>
                                生成
                            </Button>
                        </div>
                    </div>
                </Card>
                <ImageControls source={source} setSource={setSource} params={params} setParams={setParams}/>
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-6 flex flex-col gap-4 min-w-0 overflow-y-auto">
                <div className="flex-shrink-0">
                    {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4">{error}</div>}
                    {renderGallery()}
                </div>
                
                {numSelected > 0 && (
                    <Card className="flex-shrink-0">
                        <p className="text-sm font-semibold text-white mb-2">{numSelected} 张图片已选择</p>
                        <div className="grid grid-cols-2 gap-2">
                                <Button variant="primary" size="sm" onClick={() => setIsSaveImagesModalOpen(true)}>保存到图库</Button>
                                <Button variant="secondary" size="sm" onClick={downloadSelectedImages}>下载选中</Button>
                        </div>
                    </Card>
                )}
                 
                <Card className="flex-1 flex flex-col min-h-[24rem]">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">预览与导出</h2>
                             <Button variant="secondary" size="sm" onClick={() => setIsEditorModalOpen(true)} aria-label="放大并编辑内容">
                                <ExpandIcon className="w-4 h-4" />
                            </Button>
                        </div>
                        <Select value={insertionStrategy} onChange={e => {setInsertionStrategy(e.target.value as any); setIsDirty(true);}} className="text-sm w-48">
                            <option value="h2_before">在每个H2标题前插入</option>
                            <option value="p_before">在每个段落前插入</option>
                            <option value="end_of_article">在文章末尾插入</option>
                        </Select>
                    </div>
                    <div className="bg-white rounded-md p-4 flex-1 overflow-y-auto">
                        <iframe
                            title="preview"
                            srcDoc={finalPreview}
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin"
                        />
                    </div>
                </Card>
                <div className="flex-shrink-0 flex justify-end gap-2">
                    <Button variant="secondary" onClick={exportAsHtml} isLoading={isProcessing}>导出为 HTML</Button>
                    <Button variant="primary" onClick={() => setIsSavePostModalOpen(true)} isLoading={isProcessing} disabled={!articleContent.trim() && numSelected === 0}>保存为待发布文章</Button>
                </div>
            </div>
        </div>
    );
};
export default ImageTextProcessor;