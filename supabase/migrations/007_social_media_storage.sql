-- Public storage for approved social media assets that platform APIs need to fetch.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'social',
    'social',
    true,
    52428800,
    array['video/mp4', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read social assets" on storage.objects;
create policy "Public read social assets"
on storage.objects
for select
to public
using (bucket_id = 'social');

