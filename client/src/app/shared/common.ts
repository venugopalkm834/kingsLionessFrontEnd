import { ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent, ModalComponent, EmptyComponent, SkeletonComponent, PagerComponent, StatComponent, VoiceComponent } from './ui';
export const COMMON = [ReactiveFormsModule, FormsModule, RouterLink, LucideAngularModule, BadgeComponent, ModalComponent, EmptyComponent, SkeletonComponent, PagerComponent, StatComponent, VoiceComponent, DatePipe, DecimalPipe];
export const showErr = (c: AbstractControl | null) => !!c && c.invalid && (c.touched || c.dirty);
