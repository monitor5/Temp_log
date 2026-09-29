import { postTypeLabels } from '@/lib/postTypes';
import { MarkdownContent } from '@/components/MarkdownContent';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useBlocker, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, Image, X } from 'lucide-react';
import { postsApi, uploadApi, type Post } from '@/lib/api';

const emptyForm = {
  type: 'project' as 'project' | 'essay',
  title: '',
  content: '',
  tags: '',
  thumbnail: '',
  isFeatured: false,
  isHidden: true,
};

export function AdminEditor() {
  const { id } = useParams<{ id?: string }>();
  // Switching between new and existing posts must start a separate editing session.
  return <EditorDocument key={id || 'new'} id={id} />;
}

function EditorDocument({ id }: { id?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const [formData, setFormData] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [hasLoadedPost, setHasLoadedPost] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [validationError, setValidationError] = useState('');
  const uploadInProgress = useRef(false);
  const saveInProgress = useRef(false);
  const allowNavigation = useRef(false);
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialForm);

  const { data: existingPost, isError: loadFailed, error: loadError, refetch, isFetching } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getByIdOrSlug(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    // A background refetch must never replace text the author is still editing.
    if (existingPost?.data && !hasLoadedPost) {
      const post = existingPost.data;
      const loadedForm = {
        type: post.type,
        title: post.title,
        content: post.content,
        tags: post.tags.join(', '),
        thumbnail: post.thumbnail || '',
        isFeatured: post.isFeatured,
        isHidden: post.isHidden,
      };
      setFormData(loadedForm);
      setInitialForm(loadedForm);
      setHasLoadedPost(true);
    }
  }, [existingPost, hasLoadedPost]);

  useEffect(() => {
    if (!isDirty && !isUploading) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (allowNavigation.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isDirty, isUploading]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Post>) => isEditing ? postsApi.update(id!, data) : postsApi.create(data),
    onSuccess: () => {
      allowNavigation.current = true;
      void queryClient.invalidateQueries();
      navigate('/admin/dashboard');
    },
    onSettled: () => { saveInProgress.current = false; },
  });
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !allowNavigation.current && (isDirty || uploadInProgress.current || saveInProgress.current) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    // Keep pending writes attached to this editor until the operation finishes.
    if (uploadInProgress.current || saveInProgress.current) {
      blocker.reset();
      return;
    }
    if (window.confirm('저장되지 않은 변경사항이 있습니다. 편집을 나가시겠습니까?')) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  const isBusy = saveMutation.isPending || isUploading;
  const saveLabel = saveMutation.isPending ? '저장 중...' : (formData.isHidden ? '초안 저장' : '공개 저장');

  const handleSave = () => {
    if (saveInProgress.current || uploadInProgress.current || (isEditing && !hasLoadedPost)) return;
    const tags = [...new Set(formData.tags.split(',').map(tag => tag.trim()).filter(Boolean))];
    if (!formData.title.trim() || !formData.content.trim()) {
      setValidationError('제목과 콘텐츠를 입력해주세요. 공백만으로는 저장할 수 없습니다.');
      return;
    }
    if (formData.title.trim().length > 200 || formData.content.length > 200000) {
      setValidationError('제목은 200자, 콘텐츠는 200,000자까지 입력할 수 있습니다.');
      return;
    }
    if (tags.length > 20 || tags.some(tag => tag.length > 50)) {
      setValidationError('태그는 최대 20개, 각 50자까지 입력할 수 있습니다.');
      return;
    }
    setValidationError('');
    saveInProgress.current = true;
    saveMutation.mutate({
      type: formData.type,
      title: formData.title.trim(),
      content: formData.content,
      tags,
      // Empty string explicitly clears an existing thumbnail in the PATCH body.
      thumbnail: formData.thumbnail,
      isFeatured: formData.isFeatured,
      isHidden: formData.isHidden,
    });
  };

  const uploadFiles = async (files: File[], thumbnail = false) => {
    if (!files.length || saveInProgress.current) return;
    if (uploadInProgress.current) {
      setUploadError('현재 업로드가 끝난 뒤 파일을 추가해주세요.');
      return;
    }
    uploadInProgress.current = true;
    setIsUploading(true);
    setUploadError('');
    setUploadStatus('');
    const failures: string[] = [];
    let uploaded = 0;
    try {
      for (const file of files) {
        const allowed = thumbnail ? /\.(jpg|jpeg|png|gif|webp)$/i : /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm|pdf)$/i;
        if (!allowed.test(file.name)) {
          failures.push(`${file.name}: 지원하지 않는 파일 형식입니다.`);
          continue;
        }
        setUploadStatus(`${file.name} 업로드 중...`);
        try {
          const response = await uploadApi.upload(file);
          const { url, mimetype } = response.data;
          if (thumbnail) {
            setFormData(previous => ({ ...previous, thumbnail: url }));
          } else {
            // Filenames are plain text, even when they contain Markdown syntax.
            const filename = file.name.replace(/[\r\n]/g, ' ').replace(/([\\\[\]<>])/g, '\\$1');
            const markdown = mimetype.startsWith('image/') ? `![${filename}](${url})\n`
              : mimetype.startsWith('video/') ? `<video src="${url}" controls></video>\n`
              : `[${filename}](${url})\n`;
            setFormData(previous => ({
              ...previous,
              content: previous.content + (previous.content && !previous.content.endsWith('\n') ? '\n\n' : '') + markdown,
            }));
          }
          uploaded += 1;
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : '업로드에 실패했습니다.'}`);
        }
      }
      setUploadError(failures.join('\n'));
      setUploadStatus(uploaded ? `${uploaded}개 파일 업로드 완료. 게시글을 저장하면 변경사항이 반영됩니다.` : '');
    } finally {
      uploadInProgress.current = false;
      setIsUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="min-h-screen bg-surface-dark">
      <header className="bg-primary text-surface sticky top-0 z-40">
        <div className="container-narrow flex items-center justify-between h-16">
          <Link
            to="/admin/dashboard"
            aria-label="대시보드로"
            aria-disabled={isBusy}
            className="flex items-center gap-2 text-surface/60 hover:text-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">대시보드로</span>
          </Link>

          <h1 className="font-serif text-xl">{isEditing ? '게시글 수정' : '새 게시글'}</h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy || (isEditing && !hasLoadedPost) || !formData.title.trim() || !formData.content.trim()}
            aria-label={saveLabel}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-primary font-medium
                     hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{saveLabel}</span>
          </button>
        </div>
      </header>

      <main className="container-narrow py-8">
        {isEditing && !hasLoadedPost ? (
          loadFailed ? (
            <div className="bg-surface p-6">
              <p role="alert" className="text-red-600">{loadError instanceof Error ? loadError.message : '게시글을 불러오지 못했습니다.'}</p>
              <button type="button" onClick={() => void refetch()} disabled={isFetching} className="btn-primary mt-4">
                {isFetching ? '불러오는 중...' : '다시 불러오기'}
              </button>
            </div>
          ) : <p role="status" className="text-muted">게시글을 불러오는 중...</p>
        ) : <>
          <div className="mb-4 text-sm text-muted" role="status">
            {saveMutation.isPending ? '게시글을 저장하는 중입니다...' : isDirty ? '저장되지 않은 변경사항이 있습니다.' : '제목과 콘텐츠를 입력한 뒤 저장해주세요.'}
          </div>
          {(validationError || saveMutation.isError) && (
            <div role="alert" className="mb-6 p-4 bg-red-50 text-red-600">
              {validationError || (saveMutation.error instanceof Error ? saveMutation.error.message : '저장에 실패했습니다. 다시 시도해주세요.')}
            </div>
          )}
          {uploadStatus && <p role="status" className="mb-4 text-sm text-muted">{uploadStatus}</p>}
          {uploadError && <p role="alert" className="mb-4 whitespace-pre-line text-sm text-red-600">{uploadError}</p>}
          <div className="grid lg:grid-cols-2 gap-8">
            <fieldset disabled={saveMutation.isPending} className="space-y-6 min-w-0">
              <legend className="sr-only">게시글 편집</legend>
              <div className="bg-surface p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="editor-type" className="block text-sm font-medium mb-2">분류</label>
                    <select id="editor-type" value={formData.type}
                      onChange={event => setFormData({ ...formData, type: event.target.value as 'project' | 'essay' })}
                      className="input-field">
                      <option value="project">{postTypeLabels.project}</option>
                      <option value="essay">{postTypeLabels.essay}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="editor-tags" className="block text-sm font-medium mb-2">태그</label>
                    <input id="editor-tags" type="text" value={formData.tags}
                      onChange={event => setFormData({ ...formData, tags: event.target.value })}
                      placeholder="쉼표로 구분" aria-describedby="editor-tags-help" className="input-field" />
                    <p id="editor-tags-help" className="text-xs text-muted mt-1">최대 20개 · 각 50자</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="editor-title" className="block text-sm font-medium mb-2">제목</label>
                  <input id="editor-title" type="text" value={formData.title} maxLength={200} required
                    onChange={event => setFormData({ ...formData, title: event.target.value })}
                    placeholder="게시글 제목" className="input-field text-lg" />
                </div>

                <div className="focus-within:ring-2 focus-within:ring-accent">
                  <label htmlFor="editor-thumbnail" className="block text-sm font-medium mb-2">썸네일</label>
                  <input id="editor-thumbnail" type="file" accept=".jpg,.jpeg,.png,.gif,.webp"
                    disabled={isBusy} className="sr-only" aria-label="썸네일 업로드" aria-describedby="editor-thumbnail-help"
                    onChange={event => {
                      const files = Array.from(event.target.files || []);
                      event.target.value = '';
                      void uploadFiles(files, true);
                    }} />
                  {formData.thumbnail ? (
                    <div className="relative aspect-video bg-surface-dark overflow-hidden">
                      <img src={formData.thumbnail} alt="게시글 썸네일" className="w-full h-full object-cover" />
                      <button type="button" aria-label="썸네일 삭제" disabled={isBusy}
                        onClick={() => setFormData({ ...formData, thumbnail: '' })}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white hover:bg-black/70 disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="editor-thumbnail" className="aspect-video bg-surface-dark border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                      <Image className="w-8 h-8 text-muted" />
                      <span className="text-sm text-muted">클릭하여 썸네일 업로드</span>
                    </label>
                  )}
                  <p id="editor-thumbnail-help" className="text-xs text-muted mt-1">JPG, PNG, GIF, WebP 이미지</p>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isFeatured}
                      onChange={event => setFormData({ ...formData, isFeatured: event.target.checked })} className="w-4 h-4" />
                    <span className="text-sm">홈에 고정</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isHidden}
                      onChange={event => setFormData({ ...formData, isHidden: event.target.checked })} className="w-4 h-4" />
                    <span className="text-sm">초안 (비공개)</span>
                  </label>
                </div>
              </div>

              <div className={`bg-surface p-6 ${isDragging ? 'ring-2 ring-accent' : ''}`}
                onDragOver={event => { event.preventDefault(); if (!isBusy) setIsDragging(true); }}
                onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }}
                onDrop={handleDrop}>
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="editor-content" className="text-sm font-medium">콘텐츠 (Markdown)</label>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark text-sm cursor-pointer hover:bg-border transition-colors focus-within:ring-2 focus-within:ring-accent">
                    <Upload className="w-4 h-4" />
                    {isUploading ? '업로드 중...' : '파일 추가'}
                    <input id="editor-files" type="file" multiple aria-label="파일 추가" disabled={isBusy}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.pdf" className="sr-only"
                      onChange={event => {
                        const files = Array.from(event.target.files || []);
                        event.target.value = '';
                        void uploadFiles(files);
                      }} />
                  </label>
                </div>
                <textarea id="editor-content" value={formData.content} required maxLength={200000}
                  onChange={event => setFormData({ ...formData, content: event.target.value })}
                  placeholder="마크다운으로 콘텐츠를 작성하세요. 이미지/동영상을 드래그 앤 드롭하여 추가할 수 있습니다."
                  className="w-full h-[500px] p-4 bg-surface-dark border border-border font-mono text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
            </fieldset>

            <div className="bg-surface p-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-auto">
              <h2 className="text-sm font-medium mb-4 pb-4 border-b border-border">미리보기</h2>
              <div className="prose">
                {formData.title && <h1 className="font-serif">{formData.title}</h1>}
                <MarkdownContent>{formData.content || '*콘텐츠를 입력하면 여기에 미리보기가 표시됩니다*'}</MarkdownContent>
              </div>
            </div>
          </div>
        </>}
      </main>
    </div>
  );
}
