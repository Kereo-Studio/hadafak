import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PhotoAngle {
  FRONT = 'front',
  SIDE = 'side',
  BACK = 'back',
}

@Entity('progress_photos')
export class ProgressPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @Column({
    type: 'enum',
    enum: PhotoAngle,
    default: PhotoAngle.FRONT,
  })
  angle: PhotoAngle;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
