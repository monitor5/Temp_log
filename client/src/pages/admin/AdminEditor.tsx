import { MarkdownContent } from '@/components/MarkdownContent';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, Image, X } from 'lucide-react';
import { postsApi, uploadApi, type Post } from '@/lib/api';

export function AdminEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    type: 'project' as 'project' | 'essay',
    title: '',
    content: '',
    tags: '',
    thumbnail: '',
    isFeatured: false,
    isHidden: true,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 기존 게시글 불러오기
  const { data: existingPost } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getByIdOrSlug(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingPost?.data) {
      const post = existingPost.data;
      setFormData({
        type: post.type,
        title: post.title,
        content: post.content,
        tags: post.tags.join(', '),
        thumbnail: post.thumbnail || '',
        isFeatured: post.isFeatured,
        isHidden: post.isHidden,
      });
    }
  }, [existingPost]);

  // 저장 뮤테이션
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Post>) => {
      if (isEditing) {
        return postsApi.update(id!, data);
      }
      return postsApi.create(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      navigate('/admin/dashboard');
    },
  });

  const handleSave = () => {
    const tags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    saveMutation.mutate({
      type: formData.type,
      title: formData.title,
      content: formData.content,
      tags,
      thumbnail: formData.thumbnail || undefined,
      isFeatured: formData.isFeatured,
      isHidden: formData.isHidden,
    });
  };

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const response = await uploadApi.upload(file);
      const url = response.data.url;
      const mimetype = response.data.mimetype;

      // 커서 위치에 마크다운 삽입
      let markdown = '';
      if (mimetype.startsWith('image/')) {
        markdown = `![${file.name}](${url})\n`;
      } else if (mimetype.startsWith('video/')) {
        markdown = `<video src="${url}" controls width="100%"></video>\n`;
      }

      if (!markdown) markdown = '[첨부파일](' + url + ')\n';
      setFormData((prev) => ({
        ...prev,
        content: prev.content + markdown,
      }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|mp4|mov|webm|webp|pdf)$/i.test(file.name)
    );

    void (async () => { for (const file of validFiles) await handleFileUpload(file); })();
  };

  // 썸네일 업로드
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadApi.upload(file);
      setFormData((prev) => ({ ...prev, thumbnail: response.data.url }));
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      alert('썸네일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* 헤더 */}
      <header className="bg-primary text-surface sticky top-0 z-40">
        <div className="container-narrow flex items-center justify-between h-16">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-2 text-surface/60 hover:text-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">대시보드로</span>
          </Link>
          
          <h1 className="font-serif text-xl">
            {isEditing ? '게시글 수정' : '새 게시글'}
          </h1>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || isUploading || !formData.title || !formData.content}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-primary font-medium
                     hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">
              {saveMutation.isPending ? '저장 중...' : (formData.isHidden ? '초안 저장' : '공개 저장')}
            </span>
          </button>
        </div>
      </header>

      <main className="container-narrow py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 에디터 */}
          <div className="space-y-6">
            {/* 메타 정보 */}
            <div className="bg-surface p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">타입</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'project' | 'essay' })
                    }
                    className="input-field"
                  >
                    <option value="project">Project</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">태그</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="쉼표로 구분"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="게시글 제목"
                  className="input-field text-lg"
                />
              </div>

              {/* 썸네일 */}
              <div>
                <label className="block text-sm font-medium mb-2">썸네일</label>
                {formData.thumbnail ? (
                  <div className="relative aspect-video bg-surface-dark overflow-hidden">
                    <img
                      src={formData.thumbnail}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setFormData({ ...formData, thumbnail: '' })}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block aspect-video bg-surface-dark border-2 border-dashed 
                                  border-border hover:border-primary transition-colors cursor-pointer
                                  flex flex-col items-center justify-center gap-2">
                    <Image className="w-8 h-8 text-muted" />
                    <span className="text-sm text-muted">클릭하여 썸네일 업로드</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 옵션 */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData({ ...formData, isFeatured: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">홈에 고정</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHidden}
                    onChange={(e) =>
                      setFormData({ ...formData, isHidden: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">초안 (비공개)</span>
                </label>
              </div>
            </div>

            {/* 마크다운 에디터 */}
            <div
              className={`bg-surface p-6 ${isDragging ? 'ring-2 ring-accent' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium">콘텐츠 (Markdown)</label>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark 
                                text-sm cursor-pointer hover:bg-border transition-colors">
                  <Upload className="w-4 h-4" />
                  {isUploading ? '업로드 중...' : '파일 추가'}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="마크다운으로 콘텐츠를 작성하세요. 이미지/동영상을 드래그 앤 드롭하여 추가할 수 있습니다."
                className="w-full h-[500px] p-4 bg-surface-dark border border-border
                         font-mono text-sm resize-none focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* 미리보기 */}
          <div className="bg-surface p-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-auto">
            <h3 className="text-sm font-medium mb-4 pb-4 border-b border-border">미리보기</h3>
            <div className="prose">
              {formData.title && (
                <h1 className="font-serif">{formData.title}</h1>
              )}
              <MarkdownContent>
                {formData.content || '*콘텐츠를 입력하면 여기에 미리보기가 표시됩니다*'}
              </MarkdownContent>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {saveMutation.isError && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 text-center">
            저장에 실패했습니다. 다시 시도해주세요.
          </div>
        )}
      </main>
    </div>
  );
}

