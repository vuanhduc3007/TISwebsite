import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { featuredProjects } from "@/content/projects-data";
import { IconBuildingCommunity, IconCalendar } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Dự án"
};

export default function ProjectsPage() {
  const sortedProjects = [...featuredProjects].sort((a, b) => b.valueNumber - a.valueNumber);

  return (
    <main>
      <PageHero
        title="Công trình cùng TIS"
        description="Từ hệ thống CNTT cho cơ quan nhà nước đến điện mặt trời mái nhà cho doanh nghiệp, TIS đã thực hiện nhiều dự án trên cả nước."
        image="/images/projects/cho-nga-tu-dau-rooftop-aerial-01.jpg"
        imageAlt="Thi công điện mặt trời trên mái công trình"
      />
      
      <section className="site-shell section-space pt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          {sortedProjects.map((project, index) => {
            const isLargest = project.valueNumber === 22186327987;
            
            return (
              <article 
                key={index} 
                className={`content-panel reveal flex flex-col justify-between ${
                  isLargest ? "lg:col-span-2 lg:flex-row gap-8 border-2 border-[var(--accent)]" : "gap-5"
                }`}
              >
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    {project.pillar === "it" ? (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                        CNTT
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Năng lượng tái tạo
                      </span>
                    )}
                  </div>
                  
                  <h2 className={`${isLargest ? "text-2xl" : "text-xl"} font-semibold text-[var(--ink)]`}>
                    {project.name}
                  </h2>
                  
                  <div className="text-[var(--ink-muted)] text-sm space-y-3 mt-auto">
                    <p className="flex items-start gap-2">
                      <IconBuildingCommunity size={18} className="shrink-0 mt-0.5" />
                      <span className="leading-tight">{project.client}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <IconCalendar size={18} className="shrink-0" />
                      <span>{project.date}</span>
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-[var(--line)]">
                    <p className="text-sm text-[var(--ink-muted)] mb-1">Giá trị hợp đồng:</p>
                    <p className="text-xl font-bold text-[var(--accent)]">{project.value}</p>
                  </div>
                </div>
                
                {project.image && (
                  <div className={`relative overflow-hidden rounded-[12px] bg-[var(--surface-muted)] shrink-0 ${
                    isLargest ? "w-full lg:w-1/2 min-h-[16rem]" : "w-full h-48 mt-2"
                  }`}>
                    <Image 
                      src={project.image} 
                      alt={project.name} 
                      fill 
                      sizes={isLargest ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"} 
                      className="object-cover" 
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
