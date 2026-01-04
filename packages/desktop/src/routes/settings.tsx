import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card } from '../components/ui';
import { useSidebarNavItems } from '../context/SidebarContext';
import { usePluginToggle } from '../hooks/useGlobalConfig';
import { AVAILABLE_PLUGINS } from '../lib/plugins';
import styles from './settings.module.css';

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { setNavItems } = useSidebarNavItems();
  const { isPluginEnabled, togglePlugin, isPending } = usePluginToggle();

  useEffect(() => {
    setNavItems([]);
    return () => setNavItems([]);
  }, [setNavItems]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Configure global WordForge settings</p>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>OpenCode Plugins</h2>
            <p className={styles.sectionDescription}>
              Add authentication providers for AI models. After enabling a
              plugin, open any OpenCode session and click the + button to
              authenticate.
            </p>
          </div>

          <div className={styles.pluginList}>
            {AVAILABLE_PLUGINS.map((plugin) => {
              const enabled = isPluginEnabled(plugin.packageName);
              return (
                <Card key={plugin.id} className={styles.pluginCard}>
                  <div className={styles.pluginInfo}>
                    <div className={styles.pluginHeader}>
                      <span className={styles.pluginName}>{plugin.name}</span>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={isPending}
                          onChange={(e) =>
                            togglePlugin(plugin, e.target.checked)
                          }
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                    <p className={styles.pluginDescription}>
                      {plugin.description}
                    </p>
                    <span className={styles.pluginModels}>{plugin.models}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
