import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Profile } from '../../profiles/entities/profile.entity';
import { WorkoutSession } from '../../workouts/entities/workout-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  // 'local' for email/password, 'google' for Google sign-in.
  @Column({ default: 'local' })
  provider: string;

  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @OneToMany(() => WorkoutSession, (session) => session.user)
  workoutSessions: WorkoutSession[];
}
