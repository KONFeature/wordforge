import { createFileRoute } from '@tanstack/react-router';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OAuthCallbackModal } from '../components/OAuthCallbackModal';
import { OAuthProviderCard } from '../components/OAuthProviderCard';
import { Card } from '../components/ui';
import { useSidebarNavItems } from '../context/SidebarContext';
import { usePluginToggle } from '../hooks/useGlobalConfig';
import { useOAuthLogin } from '../hooks/useOAuthLogin';
import { OAUTH_PROVIDERS } from '../lib/oauth-providers';
import { AVAILABLE_PLUGINS } from '../lib/plugins';
import styles from './settings.module.css';

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { setNavItems } = useSidebarNavItems();
  const { isPluginEnabled, togglePlugin, isPending } = usePluginToggle();
  const {
    state,
    startLogin,
    submitCode,
    reset,
    currentProvider,
    isSubmittingCode,
  } = useOAuthLogin();
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setNavItems([]);
    return () => setNavItems([]);
  }, [setNavItems]);

  const mainProviders = OAUTH_PROVIDERS.filter((p) => !p.experimental);
  const experimentalProviders = OAUTH_PROVIDERS.filter((p) => p.experimental);

  const showCallbackModal =
    state.status === 'waiting-for-callback' && currentProvider;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Configure global WordForge settings</p>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Quick Login</h2>
            <p className={styles.sectionDescription}>
              Sign in to use AI models directly with your subscription. No API
              keys required.
            </p>
          </div>

          <div className={styles.oauthGrid}>
            {mainProviders.map((provider) => (
              <OAuthProviderCard
                key={provider.id}
                provider={provider}
                state={state}
                isActive={currentProvider?.id === provider.id}
                onSignIn={() => startLogin(provider)}
              />
            ))}
          </div>

          {experimentalProviders.length > 0 && (
            <div className={styles.experimentalSection}>
              <div className={styles.experimentalHeader}>
                <span className={styles.experimentalLabel}>Experimental</span>
                <span className={styles.experimentalHint}>
                  These providers may be unstable
                </span>
              </div>
              <div className={styles.oauthGrid}>
                {experimentalProviders.map((provider) => (
                  <OAuthProviderCard
                    key={provider.id}
                    provider={provider}
                    state={state}
                    isActive={currentProvider?.id === provider.id}
                    onSignIn={() => startLogin(provider)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <button
            type="button"
            className={styles.advancedToggle}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span>Advanced: OpenCode Plugins</span>
          </button>

          {showAdvanced && (
            <>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionDescription}>
                  Manually manage OpenCode plugins. After enabling a plugin, you
                  may need to restart the server and authenticate through the
                  OpenCode interface.
                </p>
              </div>

              <div className={styles.pluginList}>
                {AVAILABLE_PLUGINS.map((plugin) => {
                  const enabled = isPluginEnabled(plugin.packageName);
                  return (
                    <Card
                      key={plugin.packageName}
                      className={styles.pluginCard}
                    >
                      <div className={styles.pluginInfo}>
                        <div className={styles.pluginHeader}>
                          <span className={styles.pluginName}>
                            {plugin.name}
                          </span>
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
                        <div className={styles.pluginFooter}>
                          <span className={styles.pluginModels}>
                            {plugin.models}
                          </span>
                          <button
                            type="button"
                            className={styles.githubLink}
                            onClick={() => openUrl(plugin.github)}
                          >
                            <ExternalLink size={12} />
                            <span>GitHub</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {showCallbackModal && state.status === 'waiting-for-callback' && (
        <OAuthCallbackModal
          provider={currentProvider}
          authorization={state.authorization}
          onSubmitCode={submitCode}
          onCancel={reset}
          isSubmitting={isSubmittingCode}
        />
      )}
    </div>
  );
}
