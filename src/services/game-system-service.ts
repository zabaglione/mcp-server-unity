import { Logger } from '../types/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from './base-service.js';
import { ensureDirectory } from '../utils/file-utils.js';
import path from 'path';
import fs from 'fs/promises';

export class GameSystemService extends BaseService {
  constructor(logger: Logger) {
    super(logger);
  }

  /**
   * Create a complete player controller system
   */
  async createPlayerController(
    gameType: string,
    requirements: string[]
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const template = this.generatePlayerControllerTemplate(gameType, requirements);
    const fileName = 'PlayerController.cs';
    const filePath = path.join(this.unityProject!.scriptsPath, 'Player', fileName);

    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, template, 'utf-8');

    // Create additional required scripts
    const additionalScripts = this.getAdditionalPlayerScripts(gameType, requirements);
    for (const [name, content] of Object.entries(additionalScripts)) {
      const scriptPath = path.join(this.unityProject!.scriptsPath, 'Player', name);
      await fs.writeFile(scriptPath, content, 'utf-8');
    }

    return {
      content: [{
        type: 'text',
        text: `Player controller system created for ${gameType}.\n` +
              `Main script: Scripts/Player/${fileName}\n` +
              `Additional scripts: ${Object.keys(additionalScripts).join(', ')}\n` +
              `Features: ${requirements.join(', ')}`
      }]
    };
  }

  /**
   * Create camera system
   */
  async createCameraSystem(
    cameraType: 'FirstPerson' | 'ThirdPerson' | '2D' | 'Custom',
    specifications: any
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const template = this.generateCameraTemplate(cameraType, specifications);
    const fileName = `${cameraType}Camera.cs`;
    const filePath = path.join(this.unityProject!.scriptsPath, 'Camera', fileName);

    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, template, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `Camera system created: ${cameraType}\n` +
              `Script: Scripts/Camera/${fileName}\n` +
              `Specifications: ${JSON.stringify(specifications, null, 2)}`
      }]
    };
  }

  /**
   * Create UI framework
   */
  async createUIFramework(
    uiType: 'Mobile' | 'Desktop' | 'VR',
    screens: string[]
  ): Promise<CallToolResult> {
    this.ensureProjectSet();

    const createdFiles: string[] = [];

    // Create UI Manager
    const uiManagerTemplate = this.generateUIManagerTemplate(uiType);
    const uiManagerPath = path.join(this.unityProject!.scriptsPath, 'UI', 'UIManager.cs');
    await ensureDirectory(path.dirname(uiManagerPath));
    await fs.writeFile(uiManagerPath, uiManagerTemplate, 'utf-8');
    createdFiles.push('UIManager.cs');

    // Create base screen class
    const baseScreenTemplate = this.generateBaseScreenTemplate();
    const baseScreenPath = path.join(this.unityProject!.scriptsPath, 'UI', 'BaseScreen.cs');
    await fs.writeFile(baseScreenPath, baseScreenTemplate, 'utf-8');
    createdFiles.push('BaseScreen.cs');

    // Create individual screens
    for (const screen of screens) {
      const screenTemplate = this.generateScreenTemplate(screen, uiType);
      const screenName = `${screen}Screen.cs`;
      const screenPath = path.join(this.unityProject!.scriptsPath, 'UI', 'Screens', screenName);
      await ensureDirectory(path.dirname(screenPath));
      await fs.writeFile(screenPath, screenTemplate, 'utf-8');
      createdFiles.push(`Screens/${screenName}`);
    }

    return {
      content: [{
        type: 'text',
        text: `UI Framework created for ${uiType}.\n` +
              `Created ${createdFiles.length} files:\n` +
              `${createdFiles.map(f => `  - ${f}`).join('\n')}\n` +
              `Screens: ${screens.join(', ')}`
      }]
    };
  }

  /**
   * Create audio manager system
   */
  async createAudioManager(requirements: string[]): Promise<CallToolResult> {
    this.ensureProjectSet();

    const template = this.generateAudioManagerTemplate(requirements);
    const filePath = path.join(
      this.unityProject!.scriptsPath,
      'Managers',
      'AudioManager.cs'
    );

    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, template, 'utf-8');

    // Create audio mixer settings
    const mixerTemplate = this.generateAudioMixerTemplate();
    const mixerPath = path.join(
      this.unityProject!.scriptsPath,
      'Audio',
      'AudioMixerController.cs'
    );
    await ensureDirectory(path.dirname(mixerPath));
    await fs.writeFile(mixerPath, mixerTemplate, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `Audio system created with features:\n` +
              `${requirements.map(r => `  - ${r}`).join('\n')}\n` +
              `Scripts:\n` +
              `  - Managers/AudioManager.cs\n` +
              `  - Audio/AudioMixerController.cs`
      }]
    };
  }

  // Template generation methods

  private generatePlayerControllerTemplate(gameType: string, requirements: string[]): string {
    const hasInventory = requirements.includes('inventory');
    const hasCombat = requirements.includes('combat');
    const hasInteraction = requirements.includes('interaction');

    let template = `using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float jumpForce = 10f;
    [SerializeField] private float gravity = -9.81f;
    
    [Header("Components")]
    private CharacterController characterController;
    private PlayerInput playerInput;
    
    private Vector3 velocity;
    private bool isGrounded;
    
`;

    if (hasInventory) {
      template += `    private PlayerInventory inventory;
`;
    }

    if (hasCombat) {
      template += `    private PlayerCombat combat;
`;
    }

    template += `
    private void Awake()
    {
        characterController = GetComponent<CharacterController>();
        playerInput = GetComponent<PlayerInput>();
`;

    if (hasInventory) {
      template += `        inventory = GetComponent<PlayerInventory>();
`;
    }

    if (hasCombat) {
      template += `        combat = GetComponent<PlayerCombat>();
`;
    }

    template += `    }
    
    private void Update()
    {
        HandleMovement();
        HandleGravity();
`;

    if (hasInteraction) {
      template += `        HandleInteraction();
`;
    }

    template += `    }
    
    private void HandleMovement()
    {
`;

    switch (gameType) {
      case '2D_Platformer':
        template += `        Vector2 input = playerInput.actions["Move"].ReadValue<Vector2>();
        Vector3 move = new Vector3(input.x, 0f, 0f);
        characterController.Move(move * moveSpeed * Time.deltaTime);
        
        if (playerInput.actions["Jump"].triggered && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);
        }`;
        break;
      
      case '3D_FPS':
      case 'ThirdPersonRPG':
        template += `        Vector2 input = playerInput.actions["Move"].ReadValue<Vector2>();
        Vector3 move = transform.right * input.x + transform.forward * input.y;
        characterController.Move(move * moveSpeed * Time.deltaTime);
        
        if (playerInput.actions["Jump"].triggered && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);
        }`;
        break;
      
      default:
        template += `        // Implement movement for ${gameType}`;
    }

    template += `
    }
    
    private void HandleGravity()
    {
        isGrounded = characterController.isGrounded;
        
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f;
        }
        
        velocity.y += gravity * Time.deltaTime;
        characterController.Move(velocity * Time.deltaTime);
    }
`;

    if (hasInteraction) {
      template += `
    private void HandleInteraction()
    {
        if (playerInput.actions["Interact"].triggered)
        {
            // Raycast for interactable objects
            RaycastHit hit;
            if (Physics.Raycast(transform.position, transform.forward, out hit, 3f))
            {
                IInteractable interactable = hit.collider.GetComponent<IInteractable>();
                interactable?.Interact(this);
            }
        }
    }
`;
    }

    template += `}`;

    return template;
  }

  private getAdditionalPlayerScripts(
    _gameType: string,
    requirements: string[]
  ): Record<string, string> {
    const scripts: Record<string, string> = {};

    if (requirements.includes('inventory')) {
      scripts['PlayerInventory.cs'] = `using UnityEngine;
using System.Collections.Generic;

public class PlayerInventory : MonoBehaviour
{
    [SerializeField] private int maxSlots = 20;
    private List<Item> items = new List<Item>();
    
    public bool AddItem(Item item)
    {
        if (items.Count < maxSlots)
        {
            items.Add(item);
            return true;
        }
        return false;
    }
    
    public void RemoveItem(Item item)
    {
        items.Remove(item);
    }
    
    public List<Item> GetItems()
    {
        return new List<Item>(items);
    }
}

[System.Serializable]
public class Item
{
    public string name;
    public int id;
    public Sprite icon;
    public int stackSize = 1;
}`;
    }

    if (requirements.includes('combat')) {
      scripts['PlayerCombat.cs'] = `using UnityEngine;

public class PlayerCombat : MonoBehaviour
{
    [Header("Combat Stats")]
    [SerializeField] private float damage = 10f;
    [SerializeField] private float attackRange = 2f;
    [SerializeField] private float attackCooldown = 0.5f;
    
    private float lastAttackTime;
    
    public void Attack()
    {
        if (Time.time - lastAttackTime < attackCooldown) return;
        
        lastAttackTime = Time.time;
        
        // Perform attack
        Collider[] hits = Physics.OverlapSphere(transform.position + transform.forward, attackRange);
        foreach (var hit in hits)
        {
            IDamageable damageable = hit.GetComponent<IDamageable>();
            damageable?.TakeDamage(damage);
        }
    }
}

public interface IDamageable
{
    void TakeDamage(float damage);
}`;
    }

    if (requirements.includes('interaction')) {
      scripts['IInteractable.cs'] = `using UnityEngine;

public interface IInteractable
{
    void Interact(PlayerController player);
    string GetInteractionPrompt();
}`;
    }

    return scripts;
  }

  private generateCameraTemplate(cameraType: string, specifications: any): string {
    const templates: Record<string, string> = {
      'FirstPerson': `using UnityEngine;
using UnityEngine.InputSystem;

public class FirstPersonCamera : MonoBehaviour
{
    [Header("Mouse Settings")]
    [SerializeField] private float mouseSensitivity = ${specifications.sensitivity || 100}f;
    [SerializeField] private float maxLookAngle = ${specifications.maxLookAngle || 80}f;
    
    private float verticalRotation = 0;
    private PlayerInput playerInput;
    private Transform playerBody;
    
    private void Start()
    {
        playerInput = GetComponentInParent<PlayerInput>();
        playerBody = transform.parent;
        
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }
    
    private void Update()
    {
        HandleMouseLook();
    }
    
    private void HandleMouseLook()
    {
        Vector2 mouseInput = playerInput.actions["Look"].ReadValue<Vector2>();
        
        float mouseX = mouseInput.x * mouseSensitivity * Time.deltaTime;
        float mouseY = mouseInput.y * mouseSensitivity * Time.deltaTime;
        
        // Rotate player body horizontally
        playerBody.Rotate(Vector3.up * mouseX);
        
        // Rotate camera vertically
        verticalRotation -= mouseY;
        verticalRotation = Mathf.Clamp(verticalRotation, -maxLookAngle, maxLookAngle);
        transform.localRotation = Quaternion.Euler(verticalRotation, 0f, 0f);
    }
}`,

      'ThirdPerson': `using UnityEngine;
using UnityEngine.InputSystem;

public class ThirdPersonCamera : MonoBehaviour
{
    [Header("Target")]
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0, ${specifications.height || 2}, ${specifications.distance || -5});
    
    [Header("Camera Settings")]
    [SerializeField] private float smoothTime = ${specifications.smoothing || 0.3}f;
    [SerializeField] private float rotationSpeed = ${specifications.rotationSpeed || 5}f;
    
    private Vector3 velocity = Vector3.zero;
    private PlayerInput playerInput;
    
    private void Start()
    {
        playerInput = FindObjectOfType<PlayerInput>();
    }
    
    private void LateUpdate()
    {
        if (target == null) return;
        
        // Calculate desired position
        Vector3 desiredPosition = target.position + target.rotation * offset;
        
        // Smooth movement
        transform.position = Vector3.SmoothDamp(transform.position, desiredPosition, ref velocity, smoothTime);
        
        // Look at target
        transform.LookAt(target.position + Vector3.up * 1.5f);
        
        // Handle camera rotation input
        Vector2 rotationInput = playerInput.actions["CameraRotate"].ReadValue<Vector2>();
        if (rotationInput.magnitude > 0.1f)
        {
            target.Rotate(Vector3.up, rotationInput.x * rotationSpeed);
        }
    }
}`,

      '2D': `using UnityEngine;

public class Camera2D : MonoBehaviour
{
    [Header("Target")]
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0, 0, -10);
    
    [Header("Camera Settings")]
    [SerializeField] private float smoothTime = ${specifications.smoothing || 0.3}f;
    [SerializeField] private bool lockY = ${specifications.lockY || false};
    [SerializeField] private float yPosition = ${specifications.yPosition || 0}f;
    
    private Vector3 velocity = Vector3.zero;
    
    private void LateUpdate()
    {
        if (target == null) return;
        
        Vector3 targetPosition = target.position + offset;
        
        if (lockY)
        {
            targetPosition.y = yPosition;
        }
        
        transform.position = Vector3.SmoothDamp(transform.position, targetPosition, ref velocity, smoothTime);
    }
}`,

      'Custom': `using UnityEngine;

public class CustomCamera : MonoBehaviour
{
    [Header("Custom Camera Settings")]
    // Add your custom camera implementation here
    
    private void Start()
    {
        // Initialize custom camera
    }
    
    private void Update()
    {
        // Update custom camera logic
    }
}`
    };

    return templates[cameraType] || templates['Custom'];
  }

  private generateUIManagerTemplate(uiType: string): string {
    return `using UnityEngine;
using System.Collections.Generic;

public class UIManager : MonoBehaviour
{
    private static UIManager instance;
    public static UIManager Instance => instance;
    
    [Header("UI Configuration")]
    [SerializeField] private UIType uiType = UIType.${uiType};
    
    private Dictionary<string, BaseScreen> screens = new Dictionary<string, BaseScreen>();
    private BaseScreen currentScreen;
    
    public enum UIType
    {
        Mobile,
        Desktop,
        VR
    }
    
    private void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
        
        InitializeScreens();
    }
    
    private void InitializeScreens()
    {
        BaseScreen[] screenComponents = GetComponentsInChildren<BaseScreen>(true);
        foreach (var screen in screenComponents)
        {
            screens[screen.GetType().Name] = screen;
            screen.gameObject.SetActive(false);
        }
    }
    
    public void ShowScreen<T>() where T : BaseScreen
    {
        ShowScreen(typeof(T).Name);
    }
    
    public void ShowScreen(string screenName)
    {
        if (currentScreen != null)
        {
            currentScreen.Hide();
        }
        
        if (screens.TryGetValue(screenName, out BaseScreen screen))
        {
            currentScreen = screen;
            currentScreen.Show();
        }
        else
        {
            Debug.LogWarning($"Screen {screenName} not found!");
        }
    }
    
    public T GetScreen<T>() where T : BaseScreen
    {
        string screenName = typeof(T).Name;
        return screens.TryGetValue(screenName, out BaseScreen screen) ? screen as T : null;
    }
}`;
  }

  private generateBaseScreenTemplate(): string {
    return `using UnityEngine;
using UnityEngine.UI;

public abstract class BaseScreen : MonoBehaviour
{
    [Header("Screen Settings")]
    [SerializeField] protected CanvasGroup canvasGroup;
    [SerializeField] protected float fadeDuration = 0.3f;
    
    protected virtual void Awake()
    {
        if (canvasGroup == null)
        {
            canvasGroup = GetComponent<CanvasGroup>();
        }
    }
    
    public virtual void Show()
    {
        gameObject.SetActive(true);
        
        if (canvasGroup != null)
        {
            canvasGroup.alpha = 0f;
            LeanTween.alphaCanvas(canvasGroup, 1f, fadeDuration);
        }
        
        OnShow();
    }
    
    public virtual void Hide()
    {
        if (canvasGroup != null)
        {
            LeanTween.alphaCanvas(canvasGroup, 0f, fadeDuration)
                .setOnComplete(() => gameObject.SetActive(false));
        }
        else
        {
            gameObject.SetActive(false);
        }
        
        OnHide();
    }
    
    protected virtual void OnShow() { }
    protected virtual void OnHide() { }
}`;
  }

  private generateScreenTemplate(screenName: string, uiType: string): string {
    return `using UnityEngine;
using UnityEngine.UI;

public class ${screenName}Screen : BaseScreen
{
    [Header("${screenName} UI Elements")]
    // Add specific UI elements for this screen
    
    protected override void Awake()
    {
        base.Awake();
        
        // Initialize UI elements
        SetupUI${uiType}();
    }
    
    protected override void OnShow()
    {
        // Called when screen is shown
        Debug.Log("${screenName} screen shown");
    }
    
    protected override void OnHide()
    {
        // Called when screen is hidden
        Debug.Log("${screenName} screen hidden");
    }
    
    private void SetupUI${uiType}()
    {
        // Setup UI specific to ${uiType} platform
${uiType === 'Mobile' ? `        // Add touch controls
        // Optimize for mobile screens` : ''}
${uiType === 'VR' ? `        // Setup VR UI interactions
        // Configure for VR controllers` : ''}
${uiType === 'Desktop' ? `        // Setup keyboard/mouse interactions
        // Optimize for desktop displays` : ''}
    }
}`;
  }

  private generateAudioManagerTemplate(requirements: string[]): string {
    const has3D = requirements.includes('3d_audio');
    const hasMusic = requirements.includes('music');
    const hasDynamic = requirements.includes('dynamic');

    return `using UnityEngine;
using UnityEngine.Audio;
using System.Collections.Generic;

public class AudioManager : MonoBehaviour
{
    private static AudioManager instance;
    public static AudioManager Instance => instance;
    
    [Header("Audio Mixer")]
    [SerializeField] private AudioMixer audioMixer;
    
    [Header("Audio Sources")]
    [SerializeField] private AudioSource musicSource;
    [SerializeField] private AudioSource sfxSource;
    [SerializeField] private AudioSource ambientSource;
    
    [Header("Audio Pools")]
    [SerializeField] private int poolSize = 10;
    private Queue<AudioSource> audioSourcePool = new Queue<AudioSource>();
    
    [Header("Volume Settings")]
    [SerializeField] private float masterVolume = 1f;
    [SerializeField] private float musicVolume = 0.7f;
    [SerializeField] private float sfxVolume = 1f;
    
${hasMusic ? `    [Header("Music")]
    [SerializeField] private AudioClip[] musicTracks;
    private int currentTrackIndex = 0;
` : ''}
    
    private void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeAudioPool();
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    private void InitializeAudioPool()
    {
        for (int i = 0; i < poolSize; i++)
        {
            GameObject audioObject = new GameObject($"PooledAudioSource_{i}");
            audioObject.transform.SetParent(transform);
            AudioSource source = audioObject.AddComponent<AudioSource>();
            audioObject.SetActive(false);
            audioSourcePool.Enqueue(source);
        }
    }
    
    public void PlaySFX(AudioClip clip, Vector3 position = default)
    {
        if (clip == null) return;
        
${has3D ? `        // 3D Audio
        AudioSource source = GetPooledAudioSource();
        source.transform.position = position;
        source.spatialBlend = 1f; // Full 3D
        source.clip = clip;
        source.Play();
        
        StartCoroutine(ReturnToPool(source, clip.length));
` : `        sfxSource.PlayOneShot(clip, sfxVolume);`}
    }
    
${hasMusic ? `    public void PlayMusic(int trackIndex = -1)
    {
        if (trackIndex >= 0 && trackIndex < musicTracks.Length)
        {
            currentTrackIndex = trackIndex;
        }
        
        if (musicTracks.Length > 0)
        {
            musicSource.clip = musicTracks[currentTrackIndex];
            musicSource.Play();
        }
    }
    
    public void NextTrack()
    {
        currentTrackIndex = (currentTrackIndex + 1) % musicTracks.Length;
        PlayMusic();
    }
` : ''}
    
    public void SetMasterVolume(float volume)
    {
        masterVolume = Mathf.Clamp01(volume);
        audioMixer.SetFloat("MasterVolume", Mathf.Log10(masterVolume) * 20);
    }
    
    public void SetMusicVolume(float volume)
    {
        musicVolume = Mathf.Clamp01(volume);
        audioMixer.SetFloat("MusicVolume", Mathf.Log10(musicVolume) * 20);
    }
    
    public void SetSFXVolume(float volume)
    {
        sfxVolume = Mathf.Clamp01(volume);
        audioMixer.SetFloat("SFXVolume", Mathf.Log10(sfxVolume) * 20);
    }
    
${hasDynamic ? `    public void TransitionToState(string stateName)
    {
        // Dynamic audio state transitions
        switch (stateName)
        {
            case "Combat":
                audioMixer.SetFloat("LowPassFreq", 800f);
                SetMusicVolume(1f);
                break;
            case "Stealth":
                audioMixer.SetFloat("LowPassFreq", 2000f);
                SetMusicVolume(0.3f);
                break;
            case "Normal":
                audioMixer.SetFloat("LowPassFreq", 22000f);
                SetMusicVolume(0.7f);
                break;
        }
    }
` : ''}
    
    private AudioSource GetPooledAudioSource()
    {
        if (audioSourcePool.Count > 0)
        {
            AudioSource source = audioSourcePool.Dequeue();
            source.gameObject.SetActive(true);
            return source;
        }
        else
        {
            // Create new source if pool is empty
            GameObject audioObject = new GameObject("ExtraAudioSource");
            audioObject.transform.SetParent(transform);
            return audioObject.AddComponent<AudioSource>();
        }
    }
    
    private System.Collections.IEnumerator ReturnToPool(AudioSource source, float delay)
    {
        yield return new WaitForSeconds(delay);
        source.gameObject.SetActive(false);
        audioSourcePool.Enqueue(source);
    }
}`;
  }

  private generateAudioMixerTemplate(): string {
    return `using UnityEngine;
using UnityEditor;
using UnityEngine.Audio;

[CreateAssetMenu(fileName = "AudioMixerController", menuName = "Audio/Mixer Controller")]
public class AudioMixerController : ScriptableObject
{
    [MenuItem("MCP/Create Audio Mixer")]
    public static void CreateAudioMixer()
    {
        // Create mixer asset
        AudioMixer mixer = new AudioMixer();
        
        // Create groups
        AudioMixerGroup masterGroup = mixer.FindMatchingGroups("Master")[0];
        
        AudioMixerGroup musicGroup = mixer.CreateGroupAtPath("Music", masterGroup);
        AudioMixerGroup sfxGroup = mixer.CreateGroupAtPath("SFX", masterGroup);
        AudioMixerGroup ambientGroup = mixer.CreateGroupAtPath("Ambient", masterGroup);
        
        // Add effects
        mixer.SetFloat("MasterVolume", 0f);
        mixer.SetFloat("MusicVolume", -5f);
        mixer.SetFloat("SFXVolume", 0f);
        mixer.SetFloat("AmbientVolume", -10f);
        
        // Save the mixer
        string path = "Assets/Audio/MainAudioMixer.mixer";
        AssetDatabase.CreateAsset(mixer, path);
        AssetDatabase.SaveAssets();
        
        Debug.Log($"Audio Mixer created at: {path}");
    }
}`;
  }
}