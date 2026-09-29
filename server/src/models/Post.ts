import { randomUUID } from 'node:crypto';
import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  type: 'project' | 'essay';
  title: string;
  slug: string;
  thumbnail?: string;
  content: string;
  tags: string[];
  media: string[];
  isHidden: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    type: {
      type: String,
      enum: ['project', 'essay'],
      required: true,
      default: 'project'
    },
    title: {
      type: String,
      required: [true, '제목은 필수입니다'],
      trim: true,
      maxlength: [200, '제목은 200자를 초과할 수 없습니다']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    thumbnail: {
      type: String,
      default: null
    },
    content: {
      type: String,
      required: [true, '콘텐츠는 필수입니다']
    },
    tags: [{
      type: String,
      trim: true
    }],
    media: [{
      type: String
    }],
    isHidden: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    featuredOrder: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// 인덱스
postSchema.index({ type: 1, isHidden: 1 });
postSchema.index({ isFeatured: -1, featuredOrder: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

// 슬러그 자동 생성 (저장 전)
postSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100) + '-' + randomUUID();
  }
  next();
});

export const Post = mongoose.model<IPost>('Post', postSchema);

