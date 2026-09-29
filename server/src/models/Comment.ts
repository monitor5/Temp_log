import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment extends Document {
  postId: Types.ObjectId;
  author: string;
  passwordHash: string;
  content: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, '게시글 ID는 필수입니다']
    },
    author: {
      type: String,
      required: [true, '작성자 이름은 필수입니다'],
      trim: true,
      maxlength: [50, '이름은 50자를 초과할 수 없습니다']
    },
    passwordHash: {
      type: String,
      required: [true, '비밀번호는 필수입니다']
    },
    content: {
      type: String,
      required: [true, '댓글 내용은 필수입니다'],
      trim: true,
      maxlength: [1000, '댓글은 1000자를 초과할 수 없습니다']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// 인덱스
commentSchema.index({ postId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);

